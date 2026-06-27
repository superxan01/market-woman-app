"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { communicationRepository } from "@/lib/communication-repository";
import { supabase } from "@/lib/supabase";
import type { ChatMessage, Conversation } from "@/lib/types";
import { useMediaPermission } from "@/hooks/use-media-permission";
import { CallOverlay } from "./call-overlay";
import styles from "./chat-panel.module.css";

type ChatPanelProps = {
  compact?: boolean;
  conversationId?: string;
  conversationTitle?: string;
  onConversationChange?: (conversationId: string) => void;
  onMinimize?: () => void;
  onRead?: () => void;
};

export function ChatPanel({
  compact = false,
  conversationId: controlledConversationId,
  conversationTitle,
  onConversationChange,
  onMinimize,
  onRead
}: ChatPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [internalConversationId, setInternalConversationId] = useState<string>();
  const [currentUserId, setCurrentUserId] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File>();
  const [error, setError] = useState("");
  const [callId, setCallId] = useState<string>();
  const [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | undefined>(undefined);
  const chunks = useRef<Blob[]>([]);
  const threadRef = useRef<HTMLElement | null>(null);
  const scrollPositions = useRef<Record<string, number>>({});
  const { request, stop } = useMediaPermission();
  const activeConversationId = controlledConversationId ?? internalConversationId;
  const fileInputId = `chat-file-${activeConversationId ?? "new"}`;

  const setActiveConversationId = useCallback((nextConversationId: string) => {
    if (controlledConversationId) {
      onConversationChange?.(nextConversationId);
      return;
    }

    setInternalConversationId(nextConversationId);
    onConversationChange?.(nextConversationId);
  }, [controlledConversationId, onConversationChange]);

  const load = useCallback(async () => {
    if (controlledConversationId) return;

    try {
      const data = await communicationRepository.listConversations();
      setConversations(data);
      if (!internalConversationId && data[0]) setInternalConversationId(data[0].id);
    } catch {
      setError("Could not load messages.");
    }
  }, [controlledConversationId, internalConversationId]);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase!.auth.getUser();
      setCurrentUserId(user?.id);
    })();
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    const refresh = async () => {
      try {
        const nextMessages = await communicationRepository.messages(activeConversationId);
        if (cancelled) return;
        setMessages(nextMessages);
        await communicationRepository.read(activeConversationId);
        if (!cancelled) onRead?.();
      } catch {
        if (!cancelled) setError("Could not load messages.");
      }
    };

    void refresh();
    const channel = communicationRepository.subscribe(activeConversationId, refresh);

    return () => {
      cancelled = true;
      void channel.unsubscribe();
    };
  }, [activeConversationId, onRead]);

  useEffect(() => {
    if (!activeConversationId || !threadRef.current) return;

    const thread = threadRef.current;
    const savedPosition = scrollPositions.current[activeConversationId];
    window.requestAnimationFrame(() => {
      thread.scrollTop = savedPosition ?? thread.scrollHeight;
    });
  }, [activeConversationId, messages.length]);

  const start = async () => {
    try {
      const id = await communicationRepository.start();
      setActiveConversationId(id);
      await load();
    } catch {
      setError("Could not start support chat.");
    }
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeConversationId || (!text && !file)) return;

    try {
      await communicationRepository.send(activeConversationId, text, file?.type.startsWith("image/") ? "image" : file ? "file" : "text", file);
      setText("");
      setFile(undefined);
    } catch {
      setError("Could not send message.");
    }
  };

  const toggleRecording = async () => {
    try {
      if (recording) {
        recorder.current?.stop();
        return;
      }

      const stream = await request();
      chunks.current = [];
      const media = new MediaRecorder(stream);
      recorder.current = media;

      media.ondataavailable = (event) => chunks.current.push(event.data);
      media.onstop = async () => {
        setRecording(false);
        stop();
        const blob = new Blob(chunks.current, { type: media.mimeType || "audio/webm" });
        if (!activeConversationId) return;

        const voice = new File([blob], `voice-note-${Date.now()}.${media.mimeType.includes("mp4") ? "m4a" : "webm"}`, { type: blob.type });

        try {
          await communicationRepository.send(
            activeConversationId,
            "",
            "voice_note",
            voice,
            Math.min(120000, Math.round((chunks.current.reduce((size, chunk) => size + chunk.size, 0) / 16000) * 1000))
          );
        } catch {
          setError("Could not send voice note.");
        }
      };

      media.start();
      setRecording(true);
    } catch {
      setError("Microphone access is required to record a voice note.");
    }
  };

  const call = async () => {
    if (!activeConversationId) return;

    try {
      setCallId(await communicationRepository.requestCall(activeConversationId));
    } catch {
      setError("Could not start call.");
    }
  };

  const selectedTitle = conversationTitle ?? conversations.find((conversation) => conversation.id === activeConversationId)?.title ?? "MarketApp Support";

  return (
    <section className={styles.chat}>
      <header className={styles.header}>
        <span className={styles.avatar}>M</span>
        <div>
          <h2>{selectedTitle}</h2>
          <small>Online</small>
        </div>
        {compact && (
          <button aria-label="Minimize chat" className={styles.icon} onClick={onMinimize} type="button">
            <MinusIcon />
          </button>
        )}
        <button aria-label="Start voice call" className={styles.icon} onClick={call} type="button">
          <PhoneIcon />
        </button>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <main
        className={styles.thread}
        onScroll={(event) => {
          if (activeConversationId) scrollPositions.current[activeConversationId] = event.currentTarget.scrollTop;
        }}
        ref={threadRef}
      >
        {!activeConversationId && (
          <button className={styles.startButton} onClick={start} type="button">
            Start chat
          </button>
        )}

        {messages.map((message) => {
          const isMine = message.senderId === currentUserId;

          return (
            <article key={message.id} className={`${styles.bubble} ${isMine ? styles.mine : ""}`}>
              {message.body && <p>{message.body}</p>}
              {message.kind === "voice_note" && message.url && <audio controls src={message.url} />}
              {message.kind === "image" && message.url && (
                <a href={message.url} rel="noreferrer" target="_blank">
                  {message.fileName ?? "Open image"}
                </a>
              )}
              {message.kind === "file" && message.url && (
                <a href={message.url} rel="noreferrer" target="_blank">
                  {message.fileName ?? "Open attachment"}
                </a>
              )}
              <span className={styles.time}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </article>
          );
        })}
      </main>

      {activeConversationId && (
        <form className={styles.composer} onSubmit={send}>
          <button aria-label="Attach a file" className={styles.icon} type="button" onClick={() => document.getElementById(fileInputId)?.click()}>
            <PlusIcon />
          </button>
          <input id={fileInputId} type="file" hidden onChange={(event) => setFile(event.target.files?.[0])} />
          <input value={text} onChange={(event) => setText(event.target.value)} placeholder={file ? file.name : "Type a message"} />
          <button aria-label={recording ? "Stop recording voice note" : "Record voice note"} className={`${styles.icon} ${recording ? styles.recording : ""}`} type="button" onClick={toggleRecording}>
            <MicIcon />
          </button>
          <button aria-label="Send message" className={`${styles.icon} ${styles.send}`} type="submit">
            <SendIcon />
          </button>
        </form>
      )}

      {callId && <CallOverlay callSessionId={callId} onEnd={() => { void communicationRepository.endCall(callId); setCallId(undefined); }} />}
    </section>
  );
}

function PlusIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>;
}

function MicIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 14a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3Z" /><path d="M19 11a7 7 0 0 1-14 0M12 18v3" /></svg>;
}

function SendIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m4 12 16-7-7 16-2-7-7-2Z" /></svg>;
}

function PhoneIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9Z" /></svg>;
}

function MinusIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14" /></svg>;
}
