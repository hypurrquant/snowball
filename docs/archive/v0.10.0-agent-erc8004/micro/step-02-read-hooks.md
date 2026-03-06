# Step 02: READ 훅 구현

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (파일 삭제)
- **선행 조건**: Step 01 (ABI + 타입)

---

## 1. 구현 내용 (design.md 기반)
- `useAgentList.ts` — totalAgents() + getAgentInfo 배치 조회
- `useMyAgents.ts` — getOwnerAgents(address) + getAgentInfo 배치
- `useAgentProfile.ts` — 3개 레지스트리 조합 (getAgentInfo, ownerOf, getReputation, getSuccessRate, getReviews, isValidated, getValidation) → 1 multicall
- `useVaultBalance.ts` — 4개 토큰 getBalance 배치 조회

## 2. 완료 조건
- [ ] `domains/agent/hooks/useAgentList.ts` 존재하고 `{ agents, total, isLoading }` 반환
- [ ] `domains/agent/hooks/useMyAgents.ts` 존재하고 `{ myAgents, isLoading }` 반환
- [ ] `domains/agent/hooks/useAgentProfile.ts` 존재하고 `{ agent, reputation, reviews, validation, owner, isLoading }` 반환
- [ ] `domains/agent/hooks/useVaultBalance.ts` 존재하고 `{ balances, isLoading }` 반환
- [ ] 모든 훅이 `useReadContract` 또는 `useReadContracts` 사용
- [ ] `pnpm --filter @snowball/web exec tsc --noEmit` 에러 없음

## 3. 롤백 방법
- `rm apps/web/src/domains/agent/hooks/useAgent*.ts apps/web/src/domains/agent/hooks/useVaultBalance.ts`

---

## Scope

### 신규 생성 파일
```
apps/web/src/domains/agent/hooks/
├── useAgentList.ts         # 신규 — 전체 에이전트 목록 READ
├── useMyAgents.ts          # 신규 — 내 에이전트 목록 READ
├── useAgentProfile.ts      # 신규 — 프로필 조합 READ
└── useVaultBalance.ts      # 신규 — 볼트 잔고 READ
```

### 참고할 기존 패턴
- `domains/defi/yield/hooks/useYieldVaults.ts`: useReadContracts 배치 패턴
- `domains/defi/lend/hooks/useLendMarkets.ts`: 복수 컨트랙트 multicall 패턴

## FP/FN 검증

### 검증 통과: ✅
- 4개 훅 = 4개 파일. Scope와 1:1 매핑. 과잉/누락 없음.

---

→ 다음: [Step 03: 마켓플레이스 UI](step-03-marketplace-ui.md)
