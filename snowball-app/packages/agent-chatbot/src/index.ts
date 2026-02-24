import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { chatRouter } from "./routes/chat";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.CHATBOT_PORT || 3002;

app.use("/api/chat", chatRouter);

app.get("/api/health", (_, res) => {
  res.json({ status: "ok", agent: "chatbot", version: "1.0.0" });
});

app.listen(PORT, () => {
  console.log(`Snowball Chatbot listening on port ${PORT}`);
});
