# 작업 티켓 - v0.24.0 DDD Layer Refactoring

## 전체 현황

| # | Step | 난이도 | 롤백 | Scope | FP/FN | 개발 | 완료일 |
|---|------|--------|------|-------|-------|------|--------|
| 01 | Foundation Hygiene | 🟡 | ✅ | ✅ | ✅ | ⏳ | - |
| 02 | Bridge Hook Slimming | 🟠 | ✅ | ✅ | ✅ | ⏳ | - |
| 03 | Liquity + Borrow Page | 🔴 | ✅ | ✅ | ✅ | ⏳ | - |
| 04 | Trade + Pool Add Page | 🟠 | ✅ | ✅ | ✅ | ⏳ | - |
| 05 | Morpho + Yield + Agent | 🟠 | ✅ | ✅ | ✅ | ⏳ | - |

## 의존성

```
01 (Foundation) ──┬──→ 02 (Bridge)
                  ├──→ 03 (Liquity+Borrow)
                  ├──→ 04 (Trade+Pool)
                  └──→ 05 (Morpho+Yield+Agent)
```

Step 01은 공통 기반. Step 02~05는 Step 01 이후 순서 무관하나, 설계상 02→03→04→05 순서 권장.

## 커버리지 매트릭스

### PRD 목표 → 티켓

| PRD 목표 | 관련 티켓 | 커버 |
|----------|----------|------|
| 1. Hook Slimming | Step 02 (bridge), 03 (liquity), 04 (trade), 05 (morpho/yield/agent) | ✅ |
| 2. Layer Hygiene | Step 01 (core 확장, deep import, TxStep 이동, TokenAmount 삭제), 04 (TokenSelector 이동), 05 (morphoMath 이동) | ✅ |
| 3. App Page Slimming | Step 03 (borrow page), 04 (pool/add page) | ✅ |
| 4. 매직 넘버 정리 | Step 03 (liquity), 04 (trade), 05 (morpho/yield/agent) | ✅ |
| 제약: Behavior-preserving | 모든 Step 빌드 확인 + 수동 QA | ✅ |
| 제약: Options 무수정 | 전 Step에서 options 파일 미수정 | ✅ |

### DoD → 티켓

| DoD 항목 | 관련 티켓 | 커버 |
|----------|----------|------|
| F1 (bridge lib) | Step 02 | ✅ |
| F2 (computePositionPreview) | Step 03 | ✅ |
| F3 (computeRateStats) | Step 03 | ✅ |
| F4 (tickUtils) | Step 04 | ✅ |
| F5 (statsApi) | Step 04 | ✅ |
| F6 (morphoMath 이동) | Step 05 | ✅ |
| F7 (vaultMapper) | Step 05 | ✅ |
| F8 (agentMapper) | Step 05 | ✅ |
| F9 (hook lib import) | Step 02, 03, 04, 05 | ✅ |
| F10 (sortTokens → core) | Step 01 | ✅ |
| F11 (parseTokenAmount → core) | Step 01 | ✅ |
| F12 (needsApproval → core) | Step 01 | ✅ |
| F13 (TxStep → core/types) | Step 01 | ✅ |
| F14 (tx.ts re-export) | Step 01 | ✅ |
| F15 (morphoMath re-export) | Step 05 | ✅ |
| F16 (TokenSelector 이동) | Step 04 | ✅ |
| F17 (TokenAmount 삭제) | Step 01 | ✅ |
| F18 (deep import 제거) | Step 01 | ✅ |
| F19 (scripts sortTokens) | Step 01 | ✅ |
| F20 (borrow page slimming) | Step 03 | ✅ |
| F21 (useOpenTrovePipeline) | Step 03 | ✅ |
| F22 (TroveDelegation) | Step 03 | ✅ |
| F23 (pool/add 매직넘버) | Step 04 | ✅ |
| F24 (liquity constants) | Step 03 | ✅ |
| F25 (trade constants) | Step 04 | ✅ |
| F26 (morpho constants) | Step 05 | ✅ |
| F27 (yield constants) | Step 05 | ✅ |
| F28 (agent constants) | Step 05 | ✅ |
| F29 (인라인 매직넘버 제거) | Step 03 | ✅ |
| N1 (web 빌드) | 모든 Step | ✅ |
| N2 (server 빌드) | Step 01 | ✅ |
| N3 (behavior-preserving) | Step 02 (bridge QA), 03 (borrow QA), 04 (swap/pool QA), 05 (lend/yield/agent QA) | ✅ |
| N4 (options 무수정) | Step 05 완료 조건에 git diff 검증 포함 | ✅ |
| N5 (re-export) | Step 01 (tx.ts), 05 (morphoMath) | ✅ |
| N6 (core deep re-export 유예) | Step 01, 05 완료 조건에 git diff 검증 포함 | ✅ |
| E1 (re-export 체이닝) | Step 01 빌드(N1) | ✅ |
| E2 (formatUsdCompact) | Step 04 수동 QA | ✅ |
| E3 (yield→morpho cross-domain) | Step 05 빌드 + yield QA | ✅ |
| E4 (TroveDelegation) | Step 03 수동 QA | ✅ |
| E5 (useOpenTrovePipeline) | Step 03 수동 QA | ✅ |
| E6 (sortTokens scripts import) | Step 01 완료 조건에 tsx -e 검증 포함 | ✅ |
| E7 (bridge flow) | Step 02 수동 QA | ✅ |

### 설계 결정 → 티켓

| 설계 결정 | 관련 티켓 | 커버 |
|----------|----------|------|
| re-export 패턴 | Step 01 (tx.ts), 05 (morphoMath) | ✅ |
| domain/lib/ 표준 | Step 02, 03, 04, 05 | ✅ |
| packages/core 확장 | Step 01 | ✅ |
| cross-domain (yield→morpho) | Step 05 | ✅ |
| TroveDelegation UI-only | Step 03 | ✅ |
| deep import 제거 | Step 01 | ✅ |
| core deep re-export 유예 | N6 (전 Step) | ✅ |

## Step 상세
- [Step 01: Foundation Hygiene](step-01-foundation.md)
- [Step 02: Bridge Hook Slimming](step-02-bridge.md)
- [Step 03: Liquity + Borrow Page](step-03-liquity-borrow.md)
- [Step 04: Trade + Pool Add Page](step-04-trade-pool.md)
- [Step 05: Morpho + Yield + Agent](step-05-morpho-yield-agent.md)
