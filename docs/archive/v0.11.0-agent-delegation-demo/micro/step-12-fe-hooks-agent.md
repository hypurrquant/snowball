# Step 12: FE 훅 — Agent Run + Activity

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (파일 삭제)
- **선행 조건**: Step 13 (BFF 프록시 — URL 경로 확정 필요, 또는 동시 진행 가능)
- **DoD 매핑**: F26, F27, F28

---

## 1. 구현 내용 (design.md 기반)

- `apps/web/src/domains/agent/hooks/useRunAgent.ts`
  - `/api/agent/run` BFF 프록시 호출 (POST)
  - `{ user, manifestId }` → `{ runId, status, plan, txHashes }`
  - loading/error/success 상태 관리
- `apps/web/src/domains/agent/hooks/useAgentRuns.ts`
  - `/api/agent/runs` BFF 프록시 호출 (GET)
  - `?user=0x...&limit=20` → `RunResult[]`
  - 폴링 또는 수동 refetch
- `apps/web/src/domains/agent/hooks/useActivityLog.ts`
  - `ExecutedOnBehalf` 온체인 이벤트 로그 조회 (useContractEvents 또는 getLogs)
  - AgentVault 컨트랙트에서 emit된 이벤트만 대상

## 2. 완료 조건

- [ ] `useRunAgent.ts` — "Run Agent" 클릭 → `/api/agent/run` 호출 → 결과 반환 (F26)
- [ ] `useAgentRuns.ts` — `/api/agent/runs` 호출 → 실행 이력 반환 (F27)
- [ ] `useActivityLog.ts` — `ExecutedOnBehalf` 이벤트 조회 (F28)
- [ ] `tsc --noEmit` 통과

## 3. 롤백 방법
- 3개 파일 삭제

---

## Scope

### 신규 생성 파일
```
apps/web/src/domains/agent/hooks/
├── useRunAgent.ts        # 신규 — /api/agent/run 호출
├── useAgentRuns.ts       # 신규 — /api/agent/runs 호출
└── useActivityLog.ts     # 신규 — ExecutedOnBehalf 이벤트 조회
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| core/abis/agent.ts | 직접 import | AgentVault ABI (ExecutedOnBehalf 이벤트) |
| core/config/addresses.ts | 직접 import | AgentVault 주소 |

### 참고할 기존 패턴
- `apps/web/src/domains/agent/hooks/useAgentList.ts` — fetch 패턴 참고
- `apps/web/src/domains/agent/hooks/useVaultBalance.ts` — useReadContract 패턴

## FP/FN 검증

### 검증 체크리스트
- [x] useRunAgent — F26
- [x] useAgentRuns — F27
- [x] useActivityLog — F28

### 검증 통과: ✅

---

> 다음: [Step 13: FE BFF 프록시](step-13-fe-bff-proxy.md)
