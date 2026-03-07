# Step 02: useSmartDeposit Hook + useCreatePosition 수정

## 메타데이터
- **난이도**: 🔴 어려움
- **롤백 가능**: ✅ (신규 파일 삭제 + useCreatePosition git restore)
- **선행 조건**: Step 01 (tokenAllocation.ts)

---

## 1. 구현 내용 (design.md 기반)

### useSmartDeposit.ts 신규 생성
- `SmartDepositState`: `{ input0, input1, amount0, amount1, lastEditedToken, coeff }`
- `handleToken0Change(value)`: parseTokenAmount → calcOtherTokenAmount → balance capping
- `handleToken1Change(value)`: 역방향 동일
- `handleHalf0()`: balance0/2 입력 + paired 자동계산
- `handleHalf1()`: balance1/2 입력 + paired 자동계산
- `handleMax()`: calcMaxAmountsFromBalances로 양쪽 최대 금액
- `disabled0/disabled1`: coeff.case에서 파생 (above→disabled0, below→disabled1)
- Range 변경 시 재계산: useEffect에서 tickLower/tickUpper 변경 감지 → coeff 재계산 → anchor 기반 재계산
- Out-of-range 진입 시: disabled 토큰 "0" + lastEditedToken = null
- In-range 복귀 시: 양쪽 "0"

### useCreatePosition.ts 수정
- deposit 관련 상태/핸들러를 useSmartDeposit에 위임
- 기존 독립 `amount0/amount1/setAmount0/setAmount1/handleHalf*/handleMax*` 제거
- useSmartDeposit 호출 후 반환값 전달
- 인터페이스 마이그레이션 표(design.md) 참조

## 2. 완료 조건
- [ ] `apps/web/src/domains/trade/hooks/useSmartDeposit.ts` 파일 존재
- [ ] useSmartDeposit이 `@/core/dex/tokenAllocation` shim에서 import
- [ ] `parseEther`가 useSmartDeposit.ts 내에서 사용되지 않음 (`parseTokenAmount` 사용)
- [ ] handleToken0Change 호출 시 Token1 자동 계산
- [ ] handleToken1Change 호출 시 Token0 자동 계산
- [ ] handleMax 호출 시 양쪽 잔고 고려한 최대 금액 계산
- [ ] handleHalf0/handleHalf1 호출 시 해당 토큰 50% + paired 자동계산
- [ ] disabled0/disabled1이 coeff.case에서 파생
- [ ] range 변경 시 anchor 기반 재계산
- [ ] out-of-range → disabled 토큰 "0" + lastEditedToken null
- [ ] in-range 복귀 → 양쪽 "0"
- [ ] useCreatePosition이 useSmartDeposit에 위임하여 동작
- [ ] currentTick 미로딩 시 coeff = null → 양쪽 입력 비활성화 (E1)
- [ ] 잔고 0인 토큰으로 Max 클릭 시 양쪽 "0" 유지 (E2)
- [ ] 빈 문자열/비숫자 입력 시 raw amount = 0n, paired = "0", 에러 없음 (E4)
- [ ] `npx tsc --noEmit` 에러 0

## 3. 롤백 방법
- `apps/web/src/domains/trade/hooks/useSmartDeposit.ts` 삭제
- `git restore apps/web/src/domains/trade/hooks/useCreatePosition.ts`
- 영향 범위: useCreatePosition 반환값이 원복됨 → DepositPanel도 원복 필요

---

## Scope

### 수정 대상 파일
```
apps/web/src/domains/trade/hooks/
  └── useCreatePosition.ts   # 수정 - deposit 상태를 useSmartDeposit에 위임
```

### 신규 생성 파일
```
apps/web/src/domains/trade/hooks/
  └── useSmartDeposit.ts      # 신규 - 양방향 입력, Max, range 재계산
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| `tokenAllocation.ts` (core) | 직접 import | calcCoefficients, calcOtherTokenAmount, calcMaxAmountsFromBalances |
| `useCreatePosition.ts` | 직접 수정 | deposit 상태 위임 |
| `DepositPanel.tsx` | 간접 영향 | useCreatePosition 반환값 변경 → Step 03에서 수정 |
| `useTokenBalance` | 참조 | balance 값 소비 |
| `parseTokenAmount` | 참조 | 금액 변환 |

### Side Effect 위험
- useCreatePosition 반환값 변경으로 DepositPanel 컴파일 에러 발생 → Step 03에서 해소
- **대응**: Step 02와 03을 연속 구현하여 tsc 에러 최소화. 중간 상태에서 tsc 통과하도록 인터페이스 호환 유지

### 참고할 기존 패턴
- `/Users/mousebook/Documents/side-project/HypurrQuant_FE/apps/web/src/domains/mint/hooks/useSmartDeposit.ts`: 참조 구현
- `apps/web/src/domains/trade/hooks/useCreatePosition.ts`: 기존 deposit 로직

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| useSmartDeposit.ts | 핵심 hook | ✅ OK |
| useCreatePosition.ts | deposit 위임 수정 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| SmartDepositState | ✅ (useSmartDeposit 내부) | OK |
| handleToken0/1Change | ✅ | OK |
| handleMax/Half | ✅ | OK |
| disabled0/1 파생 | ✅ | OK |
| range 재계산 | ✅ | OK |
| useCreatePosition 위임 | ✅ | OK |

### 검증 통과: ✅

---

→ 다음: [Step 03: DepositPanel 수정](step-03-deposit-panel.md)
