import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChatService } from "../chatService";

// Mock fetch to avoid calling consumer API
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
  ok: false,
  json: () => Promise.resolve({}),
}));

describe("ChatService rule-based responses", () => {
  let service: ChatService;

  beforeEach(() => {
    // Ensure no OpenAI key so we use rule-based
    delete process.env.OPENAI_API_KEY;
    service = new ChatService();
  });

  it("responds to liquidation question (청산)", async () => {
    const res = await service.processMessage("0x" + "f".repeat(40), "청산이 뭐예요?", []);
    expect(res.reply).toContain("청산");
    expect(res.reply).toContain("MCR");
  });

  it("responds to SP question (stability pool)", async () => {
    const res = await service.processMessage("0x" + "f".repeat(40), "Stability Pool이 뭔가요?", []);
    expect(res.reply).toContain("Stability Pool");
    expect(res.reply).toContain("청산 방어");
  });

  it("responds to SP question with Korean keyword (예치)", async () => {
    const res = await service.processMessage("0x" + "f".repeat(40), "예치하면 이득이 뭐예요?", []);
    expect(res.reply).toContain("Stability Pool");
  });

  it("responds to fee question (수수료)", async () => {
    const res = await service.processMessage("0x" + "f".repeat(40), "수수료가 얼마예요?", []);
    expect(res.reply).toContain("Upfront Fee");
    expect(res.reply).toContain("가스비");
  });

  it("responds to fee question with English keyword (upfront)", async () => {
    const res = await service.processMessage("0x" + "f".repeat(40), "upfront fee가 뭐예요?", []);
    expect(res.reply).toContain("Upfront Fee");
  });

  it("responds to agent question (에이전트)", async () => {
    const res = await service.processMessage("0x" + "f".repeat(40), "AI 에이전트가 뭐예요?", []);
    expect(res.reply).toContain("에이전트");
    expect(res.reply).toContain("자동");
  });

  it("responds to risk question (리스크)", async () => {
    const res = await service.processMessage("0x" + "f".repeat(40), "리스크 관리 방법은?", []);
    expect(res.reply).toContain("리스크");
    expect(res.reply).toContain("시나리오");
  });

  it("responds to risk question (폭락)", async () => {
    const res = await service.processMessage("0x" + "f".repeat(40), "CTC가 폭락하면 어떡해요?", []);
    expect(res.reply).toContain("리스크");
  });

  it("responds to beginner question (처음)", async () => {
    const res = await service.processMessage("0x" + "f".repeat(40), "처음 시작하려면 어떻게 해요?", []);
    expect(res.reply).toContain("시작 가이드");
    expect(res.reply).toContain("Step 1");
  });

  it("responds to safety question (안전)", async () => {
    const res = await service.processMessage("0x" + "f".repeat(40), "내 포지션 안전한가요?", []);
    expect(res.reply).toContain("포지션이 없습니다");
  });

  it("responds to position summary question", async () => {
    const res = await service.processMessage("0x" + "f".repeat(40), "포지션 요약해줘", []);
    expect(res.reply).toContain("포지션이 없습니다");
  });

  it("returns default response for unknown input", async () => {
    const res = await service.processMessage("0x" + "f".repeat(40), "안녕", []);
    expect(res.reply).toContain("Snowball 어시스턴트");
    expect(res.suggestedActions).toBeDefined();
    expect(res.suggestedActions.length).toBeGreaterThan(0);
  });

  it("default response includes SP and risk topics", async () => {
    const res = await service.processMessage("0x" + "f".repeat(40), "안녕", []);
    expect(res.reply).toContain("Stability Pool");
    expect(res.reply).toContain("리스크");
  });
});
