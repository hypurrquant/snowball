// Chat Types

export interface ChatMessage {
  userAddress: string;
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  reply: string;
  conversationId: string;
  suggestedActions: string[];
  relatedData?: {
    currentCR?: string;
    liquidationPrice?: string;
    healthStatus?: "safe" | "warning" | "danger";
  };
}
