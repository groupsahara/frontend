import { apiClient, API_BASE_URL, getToken } from "./apiClient";

/* ────────────────────────────── Types ────────────────────────────── */

export interface ChatUser {
  userId: number;
  name: string | null;
  email: string | null;
  profileImage?: string | null;
  online?: boolean;
}

/**
 * A conversation's participant. The engine returns these FLATTENED — the user's
 * fields sit alongside the membership fields, there is no nested `user` object
 * (team members, from the workspace routes, do nest one — see ChatTeamMember).
 */
export interface ChatParticipantRow {
  userId: number;
  name: string | null;
  email: string | null;
  profileImage?: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt?: string;
  online?: boolean;
}

export interface ChatConversationDetail extends ChatConversationRow {
  participants: ChatParticipantRow[];
}

export interface ChatConversationRow {
  conversationId: string;
  type: "DIRECT" | "GROUP";
  name: string | null;
  avatarUrl: string | null;
  description: string | null;
  /** Set for DIRECT chats — the person on the other side. */
  peer: ChatUser | null;
  participantCount: number;
  myRole: "OWNER" | "ADMIN" | "MEMBER";
  unreadCount: number;
  lastMessage: ChatMessageRow | null;
  lastMessageAt: string;
  isPinned: boolean;
  isMuted: boolean;
}

export interface ChatMessageRow {
  messageId: number;
  conversationId: string;
  senderId: number | null;
  sender: ChatUser | null;
  type: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | "LOCATION" | "CONTACT" | "SYSTEM";
  content: string | null;
  mediaUrl: string | null;
  mediaFileName?: string | null;
  isEdited: boolean;
  deletedForEveryone: boolean;
  createdAt: string;
}

export interface ChatChannel {
  id: string;
  name: string | null;
  description: string | null;
  isDefaultChannel: boolean;
  isPrivateChannel: boolean;
  lastMessageAt: string;
  _count?: { participants: number };
}

export interface ChatTeamMember {
  chatTeamMemberId: number;
  userId: number;
  role: "OWNER" | "ADMIN" | "MEMBER";
  user: ChatUser;
}

export interface ChatTeam {
  chatTeamId: number;
  name: string;
  description: string | null;
  departmentId: number | null;
  department: { departmentId: number; name: string } | null;
  isArchived: boolean;
  members: ChatTeamMember[];
  channels: ChatChannel[];
}

export interface DirectoryEntry {
  userId: number;
  employeeId: number;
  name: string;
  email: string;
  designation: string | null;
  department: string | null;
  avatarUrl: string | null;
}

export interface AdminConversationRow {
  id: string;
  type: "DIRECT" | "GROUP" | "CHANNEL";
  name: string;
  team: { chatTeamId: number; name: string } | null;
  isDefaultChannel: boolean;
  isPrivateChannel: boolean;
  messageCount: number;
  participantCount: number;
  participants: ChatUser[];
  lastMessageAt: string;
  createdAt: string;
}

/* ─────────────────────────── Endpoints ─────────────────────────── */

/**
 * Organisation chat. Messaging rides on the existing engine (/v1/chat/*) —
 * the workspace routes add the team/channel structure and the admin console.
 */
export const chatApi = {
  // Conversations & messages
  conversations: (params: { search?: string; filter?: string; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.filter) qs.set("filter", params.filter);
    // The API rejects anything above 50 on both list endpoints, so clamp here
    // rather than letting a caller's number turn into a 400.
    qs.set("limit", String(Math.min(50, Math.max(1, params.limit ?? 50))));
    return apiClient.get<{ items: ChatConversationRow[] }>(`/v1/chat/conversations?${qs}`);
  },
  conversation: (id: string) =>
    apiClient.get<ChatConversationDetail>(`/v1/chat/conversations/${id}`),
  messages: (id: string, limit = 50) =>
    apiClient.get<{ items: ChatMessageRow[] }>(
      `/v1/chat/conversations/${id}/messages?limit=${Math.min(50, Math.max(1, limit))}`,
    ),
  sendMessage: (id: string, content: string) =>
    apiClient.post<ChatMessageRow>(`/v1/chat/conversations/${id}/messages`, {
      type: "TEXT",
      content,
    }),
  markRead: (id: string) => apiClient.post<unknown>(`/v1/chat/conversations/${id}/read`, {}),
  startDirect: (recipientId: number) =>
    apiClient.post<ChatConversationRow>("/v1/chat/conversations/direct", { recipientId }),
  createGroup: (body: { name: string; participantIds: number[]; description?: string }) =>
    apiClient.post<ChatConversationRow>("/v1/chat/conversations/group", body),
  /** "Delete chat for me" — clears my history, the conversation stays for others. */
  clearForMe: (id: string) =>
    apiClient.delete<{ message: string }>(`/v1/chat/conversations/${id}`),
  /** For me: hides it from my view only. For everyone: sender (48h) or a group admin. */
  deleteMessage: (messageId: number, forEveryone: boolean) =>
    apiClient.delete<{ messageId: number; deletedForMe?: boolean; deletedForEveryone?: boolean }>(
      `/v1/chat/messages/${messageId}?forEveryone=${forEveryone}`,
    ),
  /** Group membership — the engine allows this for the group's own admins. */
  addParticipants: (id: string, userIds: number[]) =>
    apiClient.post<{ message?: string }>(`/v1/chat/conversations/${id}/participants`, { userIds }),
  removeParticipant: (id: string, userId: number) =>
    apiClient.delete<{ message?: string }>(`/v1/chat/conversations/${id}/participants/${userId}`),

  // Workspace: teams & channels
  myTeams: () => apiClient.get<ChatTeam[]>("/v1/chat/workspace/my-teams"),
  directory: (search?: string) =>
    apiClient.get<DirectoryEntry[]>(
      `/v1/chat/workspace/directory${search ? `?search=${encodeURIComponent(search)}` : ""}`,
    ),
  teams: () => apiClient.get<ChatTeam[]>("/v1/chat/workspace/teams"),
  createTeam: (body: {
    name: string;
    description?: string;
    departmentId?: number;
    userIds?: number[];
    defaultChannelName?: string;
  }) => apiClient.post<ChatTeam>("/v1/chat/workspace/teams", body),
  updateTeam: (id: number, body: { name?: string; description?: string; isArchived?: boolean }) =>
    apiClient.patch<ChatTeam>(`/v1/chat/workspace/teams/${id}`, body),
  deleteTeam: (id: number) =>
    apiClient.delete<{ message: string }>(`/v1/chat/workspace/teams/${id}`),
  addTeamMembers: (id: number, body: { userIds?: number[]; departmentId?: number }) =>
    apiClient.post<ChatTeam>(`/v1/chat/workspace/teams/${id}/members`, body),
  removeTeamMember: (id: number, userId: number) =>
    apiClient.delete<ChatTeam>(`/v1/chat/workspace/teams/${id}/members/${userId}`),
  createChannel: (
    teamId: number,
    body: { name: string; description?: string; isPrivate?: boolean; userIds?: number[] },
  ) => apiClient.post<ChatConversationRow>(`/v1/chat/workspace/teams/${teamId}/channels`, body),
  deleteChannel: (conversationId: string) =>
    apiClient.delete<{ message: string }>(`/v1/chat/workspace/channels/${conversationId}`),

  // Admin console
  adminOverview: () =>
    apiClient.get<{
      teams: number;
      groups: number;
      directs: number;
      channels: number;
      messages: number;
      activeUsersToday: number;
    }>("/v1/chat/workspace/admin/overview"),
  adminConversations: (params: { type?: string; search?: string; scope?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.type && params.type !== "ALL") qs.set("type", params.type);
    if (params.search) qs.set("search", params.search);
    if (params.scope) qs.set("scope", params.scope);
    return apiClient.get<AdminConversationRow[]>(
      `/v1/chat/workspace/admin/conversations?${qs}`,
    );
  },
  adminMessages: (id: string) =>
    apiClient.get<{ messages: ChatMessageRow[] }>(
      `/v1/chat/workspace/admin/conversations/${id}/messages`,
    ),
  adminDeleteConversation: (id: string) =>
    apiClient.delete<{ message: string }>(`/v1/chat/workspace/admin/conversations/${id}`),
  adminDeleteMessage: (messageId: number) =>
    apiClient.delete<{ message: string }>(`/v1/chat/workspace/admin/messages/${messageId}`),
  adminAddParticipants: (id: string, userIds: number[]) =>
    apiClient.post<{ message: string }>(
      `/v1/chat/workspace/admin/conversations/${id}/participants`,
      { userIds },
    ),
  adminRemoveParticipant: (id: string, userId: number) =>
    apiClient.delete<{ message: string }>(
      `/v1/chat/workspace/admin/conversations/${id}/participants/${userId}`,
    ),
};

export const chatKeys = {
  conversations: (p: object) => ["chat", "conversations", p] as const,
  messages: (id: string) => ["chat", "messages", id] as const,
  conversation: (id: string) => ["chat", "conversation", id] as const,
  myTeams: ["chat", "my-teams"] as const,
  teams: ["chat", "teams"] as const,
  directory: (search: string) => ["chat", "directory", search] as const,
  adminOverview: ["chat", "admin", "overview"] as const,
  adminConversations: (p: object) => ["chat", "admin", "conversations", p] as const,
};

/** Socket.IO lives on the API host's /chat namespace, not under /api. */
export function chatSocketUrl(): { url: string; token: string | null } {
  // API_BASE_URL is "https://host/api" — the gateway is mounted on the origin.
  const origin = API_BASE_URL.replace(/\/api\/?$/, "");
  return { url: `${origin}/chat`, token: getToken() };
}
