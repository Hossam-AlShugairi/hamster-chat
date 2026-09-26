export interface User {
  id: string;
  username: string;
  display_name: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

export interface SessionPayload {
  userId: string;
  username: string;
  displayName: string;
}

export interface ApiError {
  error: string;
  status?: number;
}

export interface MessagesResponse {
  messages: Message[];
  hasMore: boolean;
  nextCursor?: string;
}
