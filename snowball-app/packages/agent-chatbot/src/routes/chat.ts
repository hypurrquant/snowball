import { Router } from "express";
import { v4 as uuid } from "uuid";
import { ChatService } from "../chatService";
import type { ChatMessage, ChatResponse } from "@snowball/shared";

export const chatRouter = Router();

const chatService = new ChatService();

// In-memory conversation store
const conversations = new Map<string, Array<{ role: string; content: string; timestamp: number }>>();

// POST /api/chat
chatRouter.post("/", async (req, res) => {
  try {
    const { userAddress, message, conversationId } = req.body as ChatMessage;

    const convId = conversationId || uuid();

    // Get or create conversation
    if (!conversations.has(convId)) {
      conversations.set(convId, []);
    }
    const history = conversations.get(convId)!;

    // Add user message
    history.push({ role: "user", content: message, timestamp: Date.now() });

    // Get response from chat service
    const response = await chatService.processMessage(userAddress, message, history);

    // Add assistant message
    history.push({ role: "assistant", content: response.reply, timestamp: Date.now() });

    // Limit history to last 20 messages
    if (history.length > 20) {
      conversations.set(convId, history.slice(-20));
    }

    const chatResponse: ChatResponse = {
      ...response,
      conversationId: convId,
    };

    res.json(chatResponse);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/chat/history
chatRouter.get("/history", async (req, res) => {
  try {
    const conversationId = req.query.conversationId as string;
    if (!conversationId) {
      return res.status(400).json({ error: "conversationId required" });
    }

    const history = conversations.get(conversationId) || [];
    res.json({ conversationId, messages: history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
