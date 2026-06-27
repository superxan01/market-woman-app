"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RoleGuard } from "@/components/role-guard";
import { CallOverlay } from "@/components/call-overlay";
import { ChatPanel } from "@/components/chat-panel";
import { communicationRepository } from "@/lib/communication-repository";
import { supabase } from "@/lib/supabase";
import type { CommunicationSearchResult, Conversation, UserRole } from "@/lib/types";
import styles from "./messages.module.css";

type FilterMode = "all" | "unread";

const supportRoles: UserRole[] = ["super_admin", "support_rep"];

const roleLabel = (role?: string) => {
  if (!role) return "Support";
  return role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const timeLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-NG", { hour: "2-digit", minute: "2-digit" }).format(date);
};

export default function MessagesPage() {
  const [role, setRole] = useState<UserRole>();
  const [roleLoading, setRoleLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [filter, setFilter] = useState<FilterMode>("all");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CommunicationSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>();
  const [ringingCallId, setRingingCallId] = useState<string>();
  const [activeCallId, setActiveCallId] = useState<string>();

  const isSupport = role ? supportRoles.includes(role) : false;

  const updateConversationUrl = useCallback((conversationId?: string) => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (conversationId) url.searchParams.set("conversation", conversationId);
    else url.searchParams.delete("conversation");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const loadConversations = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(false);

    try {
      const data = await communicationRepository.listConversations();
      setConversations(data);
      setSelectedId((current) => {
        const requestedId = typeof window === "undefined" ? undefined : new URLSearchParams(window.location.search).get("conversation") ?? undefined;
        const currentStillExists = current && data.some((conversation) => conversation.id === current);
        const requestedExists = requestedId && data.some((conversation) => conversation.id === requestedId);
        const next = currentStillExists ? current : requestedExists ? requestedId : data[0]?.id;
        updateConversationUrl(next);
        return next;
      });
    } catch {
      setError(true);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [updateConversationUrl]);

  useEffect(() => {
    void (async () => {
      try {
        const { data: { user } } = await supabase!.auth.getUser();
        if (!user) return;
        setCurrentUserId(user.id);

        const { data } = await supabase!
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        setRole(data?.role as UserRole);
      } finally {
        setRoleLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (role) void loadConversations();
  }, [loadConversations, role]);

  useEffect(() => {
    if (!role || !currentUserId) return;

    let cancelled = false;
    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | undefined;

    const checkIncomingCall = async () => {
      if (supportRoles.includes(role)) {
        const availability = await communicationRepository.availability();
        if (availability !== "available") {
          if (!cancelled) setRingingCallId(undefined);
          return;
        }
      }

      const { data } = await supabase!
        .from("call_sessions")
        .select("id,caller_id,status")
        .eq("status", "ringing")
        .neq("caller_id", currentUserId)
        .limit(1);

      if (!cancelled) setRingingCallId(data?.[0]?.id);
    };

    void checkIncomingCall();
    channel = communicationRepository.subscribeCalls(() => {
      void checkIncomingCall();
    });

    return () => {
      cancelled = true;
      void channel?.unsubscribe();
    };
  }, [currentUserId, role]);

  useEffect(() => {
    if (!isSupport) {
      setSearchResults([]);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);

    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const results = await communicationRepository.searchPeople(trimmed);
          if (!cancelled) setSearchResults(results);
        } catch {
          if (!cancelled) setSearchResults([]);
        } finally {
          if (!cancelled) setSearching(false);
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [isSupport, query]);

  const visibleConversations = useMemo(() => {
    return conversations
      .filter((conversation) => filter === "all" || conversation.unreadCount > 0)
      .sort((left, right) => {
        if (left.unreadCount !== right.unreadCount) return right.unreadCount - left.unreadCount;
        return Date.parse(right.lastMessageAt) - Date.parse(left.lastMessageAt);
      });
  }, [conversations, filter]);

  const selectedConversation = conversations.find((conversation) => conversation.id === selectedId);

  const selectConversation = (conversation: Conversation) => {
    setSelectedId(conversation.id);
    updateConversationUrl(conversation.id);
    setMobileChatOpen(true);
  };

  const startOwnConversation = async () => {
    setError(false);
    try {
      const id = await communicationRepository.start();
      await loadConversations();
      setSelectedId(id);
      updateConversationUrl(id);
      setMobileChatOpen(true);
    } catch {
      setError(true);
    }
  };

  const openSearchResult = async (person: CommunicationSearchResult) => {
    setError(false);
    try {
      const conversation = await communicationRepository.startForPerson(person.id);
      await loadConversations();
      setSelectedId(conversation.id);
      updateConversationUrl(conversation.id);
      setQuery("");
      setSearchResults([]);
      setMobileChatOpen(true);
    } catch {
      setError(true);
    }
  };

  const acceptIncomingCall = async () => {
    if (!ringingCallId) return;

    try {
      const callId = await communicationRepository.acceptCall(ringingCallId);
      setRingingCallId(undefined);
      setActiveCallId(callId);
    } catch {
      setRingingCallId(undefined);
      setError(true);
    }
  };

  const rejectIncomingCall = async () => {
    if (!ringingCallId) return;

    try {
      await communicationRepository.rejectCall(ringingCallId);
    } finally {
      setRingingCallId(undefined);
    }
  };

  if (roleLoading) return <main className={styles.checking}>Loading communications...</main>;
  if (!role) return <main className={styles.checking}>Sign in again to open communications.</main>;

  return (
    <RoleGuard role={role}>
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>MarketApp communications</p>
            <h1>Messages</h1>
            <p>Keep every market request, support reply, and service call in one calm workspace.</p>
          </div>
          <button className={styles.refresh} onClick={() => void loadConversations()} type="button">
            Refresh
          </button>
        </header>

        <section className={styles.workspace} aria-label="Communications inbox">
          <aside className={`${styles.sidebar} ${mobileChatOpen ? styles.mobileHidden : ""}`} aria-label="Conversation list">
            <div className={styles.searchPanel}>
              {isSupport ? (
                <>
                  <label className={styles.searchLabel} htmlFor="support-search">Search people</label>
                  <input
                    id="support-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search customers, vendors, riders"
                    className={styles.searchInput}
                  />
                  {query.trim().length >= 2 && (
                    <div className={styles.searchResults} aria-live="polite">
                      {searching && <SearchSkeleton />}
                      {!searching && searchResults.map((person) => (
                        <button
                          className={styles.searchResult}
                          key={person.id}
                          onClick={() => void openSearchResult(person)}
                          type="button"
                        >
                          <span>{person.fullName}</span>
                          <small>{roleLabel(person.role)}</small>
                        </button>
                      ))}
                      {!searching && !searchResults.length && <p className={styles.noResults}>No matching users found.</p>}
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.customerPrompt}>
                  <strong>MarketApp Support</strong>
                  <span>Send a message whenever you need help with an order.</span>
                  {!conversations.length && !loading && (
                    <button type="button" onClick={startOwnConversation}>Start conversation</button>
                  )}
                </div>
              )}
            </div>

            <div className={styles.filters} role="tablist" aria-label="Conversation filters">
              <button
                aria-selected={filter === "all"}
                className={filter === "all" ? styles.activeFilter : ""}
                onClick={() => setFilter("all")}
                role="tab"
                type="button"
              >
                All
              </button>
              <button
                aria-selected={filter === "unread"}
                className={filter === "unread" ? styles.activeFilter : ""}
                onClick={() => setFilter("unread")}
                role="tab"
                type="button"
              >
                Unread
              </button>
            </div>

            {error && (
              <div className={styles.errorBox} role="alert">
                <strong>Could not load messages.</strong>
                <span>Check your connection and try again.</span>
                <button onClick={() => void loadConversations()} type="button">Retry</button>
              </div>
            )}

            <div className={styles.list} aria-busy={loading}>
              {loading && <ConversationSkeleton />}

              {!loading && !error && visibleConversations.map((conversation) => (
                <button
                  aria-current={conversation.id === selectedId ? "true" : undefined}
                  className={`${styles.conversation} ${conversation.id === selectedId ? styles.selected : ""}`}
                  key={conversation.id}
                  onClick={() => selectConversation(conversation)}
                  type="button"
                >
                  <span className={styles.avatar}>{conversation.title.slice(0, 1).toUpperCase()}</span>
                  <span className={styles.conversationBody}>
                    <span className={styles.conversationTop}>
                      <strong>{conversation.title}</strong>
                      <time dateTime={conversation.lastMessageAt}>{timeLabel(conversation.lastMessageAt)}</time>
                    </span>
                    <span className={styles.conversationMeta}>
                      <small>{roleLabel(conversation.participantRole)}</small>
                      <span>{conversation.preview ?? "No messages yet"}</span>
                    </span>
                  </span>
                  {conversation.unreadCount > 0 && (
                    <span className={styles.badge} aria-label={`${conversation.unreadCount} unread messages`}>
                      {conversation.unreadCount}
                    </span>
                  )}
                </button>
              ))}

              {!loading && !error && !visibleConversations.length && (
                <div className={styles.empty}>
                  <strong>{filter === "unread" ? "No unread messages" : "No conversations yet"}</strong>
                  <span>
                    {filter === "unread"
                      ? "When a new reply arrives, it will appear here first."
                      : isSupport
                        ? "Search for a customer, vendor, or rider to open the right support conversation."
                        : "Start a conversation with MarketApp Support whenever you need help."}
                  </span>
                  {!isSupport && filter === "all" && (
                    <button type="button" onClick={startOwnConversation}>Start conversation</button>
                  )}
                </div>
              )}
            </div>
          </aside>

          <section className={`${styles.activePane} ${mobileChatOpen ? styles.mobileOpen : ""}`} aria-label="Active conversation">
            <div className={styles.activeHeader}>
              <button className={styles.backButton} onClick={() => setMobileChatOpen(false)} type="button">
                Back
              </button>
              <div>
                <p className={styles.eyebrow}>Active conversation</p>
                <h2>{selectedConversation?.title ?? "MarketApp Support"}</h2>
                <span>{selectedConversation ? roleLabel(selectedConversation.participantRole) : "Select a conversation to view messages"}</span>
              </div>
            </div>

            <div className={styles.chatShell}>
              <ChatPanel
                conversationId={selectedConversation?.id}
                conversationTitle={selectedConversation?.title}
                onConversationChange={(conversationId) => {
                  setSelectedId(conversationId);
                  updateConversationUrl(conversationId);
                }}
                onRead={() => void loadConversations(false)}
              />
            </div>
          </section>
        </section>

        {ringingCallId && (
          <div className={styles.incomingCall} role="dialog" aria-modal="true" aria-labelledby="incoming-call-title">
            <div>
              <span className={styles.callAvatar}>M</span>
              <p className={styles.eyebrow}>Incoming call</p>
              <h2 id="incoming-call-title">MarketApp voice call</h2>
              <p>A marketplace conversation is calling. Answer only when you are ready to speak.</p>
              <div className={styles.callActions}>
                <button onClick={rejectIncomingCall} type="button">Reject</button>
                <button onClick={acceptIncomingCall} type="button">Accept</button>
              </div>
            </div>
          </div>
        )}

        {activeCallId && (
          <CallOverlay
            callSessionId={activeCallId}
            onEnd={() => {
              void communicationRepository.endCall(activeCallId);
              setActiveCallId(undefined);
            }}
          />
        )}
      </main>
    </RoleGuard>
  );
}

function ConversationSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((item) => (
        <div className={styles.skeletonConversation} key={item}>
          <span />
          <div>
            <i />
            <b />
          </div>
        </div>
      ))}
    </>
  );
}

function SearchSkeleton() {
  return (
    <>
      {[0, 1].map((item) => (
        <div className={styles.skeletonSearch} key={item}>
          <i />
          <b />
        </div>
      ))}
    </>
  );
}
