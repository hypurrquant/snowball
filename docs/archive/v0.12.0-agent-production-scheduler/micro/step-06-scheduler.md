# Step 06: 스케줄러 멀티유저 루프

## 메타데이터
- **난이도**: 🔴 어려움
- **롤백 가능**: ✅
- **선행 조건**: Step 02 (주소 전환), Step 03 (ABI), Step 04 (config troveNFT)

---

## 1. 구현 내용 (design.md 기반)

### scheduler.service.ts 대규모 수정
1. `loadConfig()` 직접 호출 + 자체 `publicClient` 생성 + `agentEOA` 산출
2. `AGENT_CRON_USER` / `AGENT_CRON_TROVE_ID` env 참조 완전 제거
3. `getDelegatedUsers(agentEOA)` 온체인 호출 → 유저 목록 조회
4. `buildTroveMap()` 구현: `getTroveIdsCount` → `getTroveFromTroveIdsArray(i)` → `ownerOf(troveId)` → `Map<user, troveId>`
5. 유저별 순차 루프: `troveMap.get(user) ?? 0n` → `agentService.runAgent(user, manifestId, troveId)`
6. 에러 처리: RPC 실패 시 cron skip, 개별 유저 실패 시 다음 유저 계속, 빈 배열 시 debug log + skip

## 2. 완료 조건
- [ ] `AGENT_CRON_USER` 참조가 scheduler.service.ts에 없다 (`grep` 0건)
- [ ] `AGENT_CRON_TROVE_ID` 참조가 scheduler.service.ts에 없다
- [ ] `loadConfig()`를 import하고 호출하여 자체 config를 갖는다
- [ ] `privateKeyToAccount(config.agentPrivateKey).address`로 agentEOA를 산출한다
- [ ] `createPublicClient`로 자체 publicClient를 생성한다
- [ ] `getDelegatedUsers(agentEOA)` readContract 호출이 존재한다
- [ ] `buildTroveMap` 함수가 for-user 루프 밖에서 tick당 1회 호출된다
- [ ] `buildTroveMap`이 `getTroveIdsCount` → `getTroveFromTroveIdsArray` → `ownerOf` 순서로 Map을 구축한다
- [ ] 유저별 `agentService.runAgent(user, manifestId, troveId)` 호출이 for 루프 안에 있다
- [ ] `users.length === 0` 분기에서 `Logger.debug` 후 early return한다
- [ ] getDelegatedUsers RPC 실패 시 catch → error log → cron skip
- [ ] buildTroveMap 실패 시 빈 Map으로 fallback (troveId=0n)
- [ ] 개별 유저 runAgent 실패 시 해당 유저만 error log, 다음 유저 계속
- [ ] `cd apps/agent-server && npx tsc --noEmit` 통과
- [ ] `cd apps/agent-server && npm run build` 성공 (DoD N2)

## 3. 롤백 방법
- git revert로 이전 단일유저 스케줄러 복원

---

## Scope

### 수정 대상 파일
```
apps/agent-server/src/scheduler/scheduler.service.ts  # 대규모 수정 - 전면 재작성
```

### 신규 생성 파일
없음

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| @snowball/agent-runtime (loadConfig) | import 추가 | config + RPC URL 조회 |
| @snowball/agent-runtime (abis) | import 추가 | AgentVaultABI, TroveManagerABI, TroveNFTABI |
| viem | import 추가 | createPublicClient, http, Address |
| viem/accounts | import 추가 | privateKeyToAccount |
| AgentService | 기존 유지 | runAgent 호출 (인터페이스 변경 없음) |

### Side Effect 위험
- `AGENT_CRON_USER` 제거 → 이전 방식으로 운영 중이었다면 동작 변경 (의도적)
- 멀티유저 루프 도입 → cron 실행 시간 증가 (유저 수에 비례)

### 참고할 기존 패턴
- 현재 `scheduler.service.ts`: 단일유저 패턴 (교체 대상)
- `packages/agent-runtime/src/runtime.ts`: publicClient 생성 패턴

---

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| scheduler.service.ts | 멀티유저 루프 전면 수정 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| loadConfig import | ✅ scheduler.service.ts | OK |
| publicClient 생성 | ✅ scheduler.service.ts | OK |
| agentEOA 산출 | ✅ scheduler.service.ts | OK |
| getDelegatedUsers 호출 | ✅ scheduler.service.ts | OK |
| buildTroveMap 구현 | ✅ scheduler.service.ts | OK |
| 유저별 루프 | ✅ scheduler.service.ts | OK |
| AGENT_CRON_USER 제거 | ✅ scheduler.service.ts | OK |
| 에러 처리 | ✅ scheduler.service.ts | OK |

### 검증 통과: ✅
