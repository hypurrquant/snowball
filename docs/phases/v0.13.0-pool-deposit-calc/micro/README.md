# 작업 티켓 - v0.13.0

## 전체 현황

| # | Step | 난이도 | 롤백 | Scope | FP/FN | 개발 | 완료일 |
|---|------|--------|------|-------|-------|------|--------|
| 01 | tokenAllocation.ts (Pure Math) | 🟡 | ✅ | ✅ | ✅ | ✅ 완료 | 2026-03-07 |
| 02 | useSmartDeposit + useCreatePosition 수정 | 🔴 | ✅ | ✅ | ✅ | ✅ 완료 | 2026-03-07 |
| 03 | DepositPanel 컴포넌트 수정 | 🟡 | ✅ | ✅ | ✅ | ✅ 완료 | 2026-03-07 |

## 의존성

```
01 (tokenAllocation) → 02 (useSmartDeposit + useCreatePosition) → 03 (DepositPanel)
```

## 커버리지 매트릭스

### PRD 목표 → 티켓

| PRD 목표 | 관련 티켓 | 커버 |
|----------|----------|------|
| 양방향 금액 자동계산 | Step 01 (math), Step 02 (hook) | ✅ |
| Max Mint | Step 01 (calcMaxAmountsFromBalances), Step 02 (handleMax), Step 03 (Max 버튼) | ✅ |
| Out-of-range 처리 | Step 01 (calcCoefficients case), Step 02 (disabled 파생), Step 03 (disabled UI) | ✅ |
| Range 변경 시 재계산 | Step 01 (calcCoefficients), Step 02 (useEffect 재계산) | ✅ |

### DoD → 티켓

| DoD 항목 | 관련 티켓 | 커버 |
|----------|----------|------|
| F1: Token0→Token1 자동계산 | Step 01, 02 | ✅ |
| F2: Token1→Token0 자동계산 | Step 01, 02 | ✅ |
| F3: Max 양쪽 채움 | Step 01, 02, 03 | ✅ |
| F4: Half + paired | Step 02, 03 | ✅ |
| F5: Out-of-range below | Step 01, 02, 03 | ✅ |
| F6: Out-of-range above | Step 01, 02, 03 | ✅ |
| F7: Range 변경 재계산 | Step 01, 02 | ✅ |
| F8: 잔고 초과 축소 | Step 02 | ✅ |
| N1: tsc --noEmit | Step 03 (최종 확인) | ✅ |
| N2: 단위 테스트 | Step 01 | ✅ |
| N3: Pure math React-free | Step 01 | ✅ |
| N4: useSmartDeposit 위치 | Step 02 | ✅ |
| N5: shim 경유 import | Step 01 (shim), Step 02 (import) | ✅ |
| N6: parseTokenAmount 사용 | Step 02 | ✅ |
| N7: build 성공 | Step 03 (최종 확인) | ✅ |
| N8: lint 통과 | Step 03 (최종 확인) | ✅ |
| E1: currentTick 미로딩 | Step 02 | ✅ |
| E2: 잔고 0 Max | Step 02 | ✅ |
| E3: out→in 복귀 | Step 02 | ✅ |
| E4: 비숫자 입력 | Step 02 | ✅ |
| E5: 큰 tick overflow | Step 01 | ✅ |
| E6: zero-width range | Step 01 | ✅ |

### 설계 결정 → 티켓

| 설계 결정 | 관련 티켓 | 커버 |
|----------|----------|------|
| Number 타입 coefficient | Step 01 | ✅ |
| lastEditedToken anchor | Step 02 | ✅ |
| out-of-range → disabled+0+null | Step 02, 03 | ✅ |
| range 복귀 → 양쪽 0 | Step 02 | ✅ |
| Max → calcMaxAmountsFromBalances | Step 01, 02, 03 | ✅ |
| Half → 기존 의미 + paired | Step 02, 03 | ✅ |
| import shim 경유 | Step 01, 02 | ✅ |
| parseTokenAmount | Step 02 | ✅ |
| disabled0/1 coeff 파생 | Step 02, 03 | ✅ |

**커버리지: PRD 4/4, DoD 22/22, 설계 9/9 = 100%**

## Step 상세
- [Step 01: tokenAllocation.ts (Pure Math)](step-01-token-allocation.md)
- [Step 02: useSmartDeposit + useCreatePosition 수정](step-02-use-smart-deposit.md)
- [Step 03: DepositPanel 컴포넌트 수정](step-03-deposit-panel.md)
