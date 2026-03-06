# Step 04: DepositPanel 컴포넌트 — 오른쪽 Deposit 패널

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅
- **선행 조건**: Step 03 (useCreatePosition 반환값을 props로 수신)

---

## 1. 구현 내용 (design.md 기반)

2컬럼 레이아웃의 오른쪽 패널인 DepositPanel 컴포넌트를 신규 생성한다.

### 1-1. TokenDepositInput (내부 컴포넌트 × 2)
- 토큰 아이콘 (첫 글자 아바타) + 심볼 표시
- 금액 입력 필드 (string)
- `~$X.XX` USD 환산 표시 (props로 전달받은 amountUsd)
- Half 버튼: 잔고의 50%
- Max 버튼: 잔고 전체
- 잔고 표시: `Balance: X.XX` (미연결 시 "—")

### 1-2. Total Deposit + 토큰 비율 바
- Total Deposit: `~$X.XX` (amount0Usd + amount1Usd)
- 토큰 비율 바: progress bar (token0% | token1%)
- 퍼센트 라벨: `XX% / YY%`

### 1-3. Estimated APR
- `Estimated APR: XX.X%` 또는 `Estimated APR: —` (props로 전달)

### 1-4. 액션 버튼 (상태 머신)
- 미연결 → "Connect Wallet" (disabled)
- 미입력 → "Enter Amount" (disabled)
- 승인필요 → "Approve {symbol}" (active)
- 준비 → "Add Liquidity" (active)
- 진행중 → spinner + "Adding..." / "Approving..."

### 1-5. Props 인터페이스
useCreatePosition 반환값에서 필요한 필드만 props로 수신:
- token0Symbol, token1Symbol
- amount0, amount1, setAmount0, setAmount1
- handleHalf0, handleMax0, handleHalf1, handleMax1
- balance0, balance1, token0Decimals, token1Decimals
- amount0Usd, amount1Usd, totalDepositUsd, tokenRatio
- estimatedApr
- txState, handleAddLiquidity, needsApproval0, needsApproval1
- isConnected

## 2. 완료 조건
- [ ] `domains/trade/components/DepositPanel.tsx` 파일 생성
- [ ] Token0 입력 필드 + Half/Max 버튼 렌더링
- [ ] Token1 입력 필드 + Half/Max 버튼 렌더링
- [ ] 각 토큰 입력 옆 `~$X.XX` USD 환산 표시
- [ ] Total Deposit 합산 표시
- [ ] 토큰 비율 바 (progress bar + 퍼센트 라벨)
- [ ] Estimated APR 표시
- [ ] 액션 버튼 5단계 상태 렌더링 (Connect Wallet / Enter Amount / Approve / Add Liquidity / spinner)
- [ ] 잔고 미연결 시 "—" 표시 + Half/Max 버튼 disabled
- [ ] `npx tsc --noEmit` 기존 에러 외 신규 에러 0

## 3. 롤백 방법
- `rm apps/web/src/domains/trade/components/DepositPanel.tsx`
- 영향 범위: 신규 파일 1개 삭제만으로 완전 롤백

---

## Scope

### 수정 대상 파일
없음

### 신규 생성 파일
```
apps/web/src/domains/trade/components/DepositPanel.tsx  # 신규 - Deposit 패널 UI 컴포넌트
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| useCreatePosition (Step 03) | props 수신 | 반환값을 props로 전달받음 |
| addresses.ts | import 가능 | TOKEN_INFO (심볼/아이콘 참조) |

### Side Effect 위험
- 없음. 신규 파일 생성만으로 기존 코드에 영향 없음.
- Step 05에서 page.tsx가 이 컴포넌트를 렌더링할 때 통합됨.

### 참고할 기존 패턴
- `apps/web/src/domains/defi/yield/components/VaultActionDialog.tsx`: 토큰 입력 + 잔고 + 액션 버튼 패턴
- `apps/web/src/app/(trade)/swap/page.tsx`: Half/Max 버튼 패턴 참조

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| DepositPanel.tsx | 전체 Deposit 패널 UI | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| TokenDepositInput × 2 | ✅ DepositPanel 내부 | OK |
| USD 환산 표시 | ✅ DepositPanel 내부 | OK |
| Total Deposit + 비율 바 | ✅ DepositPanel 내부 | OK |
| Estimated APR | ✅ DepositPanel 내부 | OK |
| 액션 버튼 상태 머신 | ✅ DepositPanel 내부 | OK |
| Half/Max 버튼 | ✅ DepositPanel 내부 | OK |

### 검증 체크리스트
- [x] Scope의 모든 파일이 구현 내용과 연결됨
- [x] 구현 내용의 모든 항목이 Scope에 반영됨
- [x] 불필요한 파일(FP)이 제거됨
- [x] 누락된 파일(FN)이 추가됨

### 검증 통과: ✅

---

→ 다음: [Step 05: page.tsx 2컬럼 통합](step-05-page-integration.md)
