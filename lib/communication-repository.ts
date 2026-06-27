import { supabase } from "./supabase";
import type {
  ChatMessage,
  CommunicationSearchResult,
  Conversation,
  ConversationKind,
  MessageKind,
  UserRole
} from "./types";

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: UserRole;
};

type ConversationRow = {
  id: string;
  kind: ConversationKind;
  customer_id: string | null;
  vendor_id: string | null;
  rider_id: string | null;
  last_message_at: string;
  customer?: Pick<ProfileRow, "full_name" | "role"> | Pick<ProfileRow, "full_name" | "role">[] | null;
  vendor?: Pick<ProfileRow, "full_name" | "role"> | Pick<ProfileRow, "full_name" | "role">[] | null;
  rider?: Pick<ProfileRow, "full_name" | "role"> | Pick<ProfileRow, "full_name" | "role">[] | null;
};

type MessageSummaryRow = {
  conversation_id: string;
  sender_id: string;
  body: string | null;
  kind: MessageKind;
  file_name: string | null;
  created_at: string;
};

type ReadStateRow = {
  conversation_id: string;
  last_read_at: string;
};

const client = () => {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
};

const supportRoles: UserRole[] = ["super_admin", "support_rep"];
const searchableRoles: CommunicationSearchResult["role"][] = ["customer", "vendor", "rider"];

const firstJoinedProfile = (
  value: ConversationRow["customer"] | ConversationRow["vendor"] | ConversationRow["rider"]
) => Array.isArray(value) ? value[0] : value;

const participantForConversation = (conversation: ConversationRow) => {
  if (conversation.kind === "customer_support") {
    return {
      id: conversation.customer_id,
      role: "customer" as const,
      profile: firstJoinedProfile(conversation.customer)
    };
  }

  if (conversation.kind === "support_vendor") {
    return {
      id: conversation.vendor_id,
      role: "vendor" as const,
      profile: firstJoinedProfile(conversation.vendor)
    };
  }

  return {
    id: conversation.rider_id,
    role: "rider" as const,
    profile: firstJoinedProfile(conversation.rider)
  };
};

const messagePreview = (message?: MessageSummaryRow) => {
  if (!message) return "No messages yet";
  if (message.body?.trim()) return message.body.trim();
  if (message.kind === "voice_note") return "Voice note";
  if (message.kind === "image") return message.file_name ? `Image: ${message.file_name}` : "Image attachment";
  if (message.kind === "file") return message.file_name ? `File: ${message.file_name}` : "File attachment";
  return "Message";
};

const titleForConversation = (conversation: ConversationRow, currentRole: UserRole) => {
  if (!supportRoles.includes(currentRole)) return "MarketApp Support";

  const participant = participantForConversation(conversation);
  const name = participant.profile?.full_name?.trim();
  const fallback = participant.role === "customer" ? "Customer" : participant.role === "vendor" ? "Vendor" : "Rider";
  return name || fallback;
};

const toConversation = (
  conversation: ConversationRow,
  currentUserId: string,
  currentRole: UserRole,
  messages: MessageSummaryRow[],
  readStates: ReadStateRow[]
): Conversation => {
  const participant = participantForConversation(conversation);
  const latestMessage = messages.find((message) => message.conversation_id === conversation.id);
  const readState = readStates.find((state) => state.conversation_id === conversation.id);
  const lastReadAt = readState ? Date.parse(readState.last_read_at) : 0;
  const unreadCount = messages.filter((message) => {
    if (message.conversation_id !== conversation.id) return false;
    if (message.sender_id === currentUserId) return false;
    return Date.parse(message.created_at) > lastReadAt;
  }).length;

  return {
    id: conversation.id,
    kind: conversation.kind,
    title: titleForConversation(conversation, currentRole),
    lastMessageAt: latestMessage?.created_at ?? conversation.last_message_at,
    unreadCount,
    preview: messagePreview(latestMessage),
    participantId: participant.id ?? undefined,
    participantRole: supportRoles.includes(currentRole) ? participant.role : "support_rep"
  };
};

const currentProfile = async () => {
  const { data: { user }, error: userError } = await client().auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sign in is required.");

  const { data, error } = await client()
    .from("profiles")
    .select("id,full_name,role")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return data as ProfileRow;
};

const conversationSelect = `
  id,
  kind,
  customer_id,
  vendor_id,
  rider_id,
  last_message_at,
  customer:profiles!conversations_customer_id_fkey(full_name,role),
  vendor:profiles!conversations_vendor_id_fkey(full_name,role),
  rider:profiles!conversations_rider_id_fkey(full_name,role)
`;

export const communicationRepository = {
  async availability(): Promise<string> {
    const { data: { user } } = await client().auth.getUser();
    if (!user) return "busy";

    const { data, error } = await client()
      .from("support_availability")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return data?.status ?? "busy";
  },

  async setAvailability(status: "available" | "busy") {
    const { error } = await client().rpc("set_support_availability", { next_status: status });
    if (error) throw error;
  },

  async unreadCount(): Promise<number> {
    const conversations = await this.listConversations();
    return conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);
  },

  async listConversations(): Promise<Conversation[]> {
    const profile = await currentProfile();

    const { data: conversationRows, error: conversationError } = await client()
      .from("conversations")
      .select(conversationSelect)
      .eq("status", "open")
      .order("last_message_at", { ascending: false });

    if (conversationError) throw conversationError;

    const conversationIds = (conversationRows ?? []).map((conversation) => conversation.id);
    if (!conversationIds.length) return [];

    const [{ data: messageRows, error: messageError }, { data: readRows, error: readError }] = await Promise.all([
      client()
        .from("conversation_messages")
        .select("conversation_id,sender_id,body,kind,file_name,created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false }),
      client()
        .from("conversation_read_states")
        .select("conversation_id,last_read_at")
        .eq("user_id", profile.id)
        .in("conversation_id", conversationIds)
    ]);

    if (messageError) throw messageError;
    if (readError) throw readError;

    return (conversationRows as ConversationRow[])
      .map((conversation) => toConversation(
        conversation,
        profile.id,
        profile.role,
        (messageRows ?? []) as MessageSummaryRow[],
        (readRows ?? []) as ReadStateRow[]
      ))
      .sort((left, right) => {
        if (left.unreadCount !== right.unreadCount) return right.unreadCount - left.unreadCount;
        return Date.parse(right.lastMessageAt) - Date.parse(left.lastMessageAt);
      });
  },

  async searchPeople(query: string): Promise<CommunicationSearchResult[]> {
    const profile = await currentProfile();
    if (!supportRoles.includes(profile.role)) return [];

    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const { data, error } = await client()
      .from("profiles")
      .select("id,full_name,role")
      .in("role", searchableRoles)
      .ilike("full_name", `%${trimmed}%`)
      .order("full_name", { ascending: true })
      .limit(12);

    if (error) throw error;

    return (data ?? []).map((person) => ({
      id: person.id,
      fullName: person.full_name || "Unnamed account",
      role: person.role as CommunicationSearchResult["role"]
    }));
  },

  async start(): Promise<string> {
    const profile = await currentProfile();
    const { data, error } = await client().rpc("start_support_conversation", { target_id: profile.id });
    if (error) throw error;
    return data;
  },

  async startForPerson(personId: string): Promise<Conversation> {
    const profile = await currentProfile();
    if (!supportRoles.includes(profile.role)) throw new Error("Only support users can open conversations for another person.");

    const { data: conversationId, error } = await client().rpc("start_support_conversation", { target_id: personId });
    if (error) throw error;

    const conversation = (await this.listConversations()).find((item) => item.id === conversationId);
    if (!conversation) throw new Error("Conversation was created but could not be loaded.");
    return conversation;
  },

  async messages(conversationId: string): Promise<ChatMessage[]> {
    const { data, error } = await client()
      .from("conversation_messages")
      .select("id,conversation_id,sender_id,kind,body,storage_path,file_name,mime_type,duration_ms,created_at")
      .eq("conversation_id", conversationId)
      .order("created_at");

    if (error) throw error;

    return Promise.all((data ?? []).map(async (message) => {
      let url: string | undefined;
      if (message.storage_path) {
        const signed = await client().storage.from("chat-media").createSignedUrl(message.storage_path, 900);
        url = signed.data?.signedUrl;
      }

      return {
        id: message.id,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        kind: message.kind,
        body: message.body ?? undefined,
        fileName: message.file_name ?? undefined,
        mimeType: message.mime_type ?? undefined,
        durationMs: message.duration_ms ?? undefined,
        url,
        createdAt: message.created_at
      };
    }));
  },

  async send(conversationId: string, body: string, kind: MessageKind = "text", file?: File, durationMs?: number) {
    let path: string | undefined;

    if (file) {
      path = `${conversationId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const { error } = await client().storage.from("chat-media").upload(path, file, { contentType: file.type });
      if (error) throw error;
    }

    const { error } = await client().rpc("send_conversation_message", {
      conversation: conversationId,
      message_kind: kind,
      message_body: body || null,
      media_path: path || null,
      media_name: file?.name || null,
      media_type: file?.type || null,
      note_duration: durationMs || null
    });

    if (error) throw error;
  },

  async read(conversationId: string) {
    const { error } = await client().rpc("mark_conversation_read", { conversation: conversationId });
    if (error) throw error;
  },

  async requestCall(conversationId: string): Promise<string> {
    const { data, error } = await client().rpc("request_call", { conversation: conversationId });
    if (error) throw error;
    return data;
  },

  async endCall(callId: string) {
    const { error } = await client().rpc("end_call", { call: callId, result: "ended" });
    if (error) throw error;
  },

  async acceptCall(callId: string) {
    const { data, error } = await client().rpc("accept_call", { call: callId });
    if (error) throw error;
    return data as string;
  },

  async rejectCall(callId: string) {
    const { error } = await client().rpc("reject_call", { call: callId });
    if (error) throw error;
  },

  subscribeCalls(onChange: () => void) {
    return client()
      .channel("marketapp-calls")
      .on("postgres_changes", { event: "*", schema: "public", table: "call_sessions" }, onChange)
      .subscribe();
  },

  subscribe(conversationId: string, onChange: () => void) {
    return client()
      .channel(`conversation:${conversationId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_messages", filter: `conversation_id=eq.${conversationId}` }, onChange)
      .subscribe();
  }
};
