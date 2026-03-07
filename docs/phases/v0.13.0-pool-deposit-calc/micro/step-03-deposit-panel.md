# Step 03: DepositPanel 컴포넌트 수정

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (git restore)
- **선행 조건**: Step 02 (useSmartDeposit + useCreatePosition 수정)

---

## 1. 구현 내용 (design.md 기반)

### DepositPanel.tsx 수정
- Props 인터페이스 변경 (design.md 인터페이스 마이그레이션 표 참조):
  - `setAmount0` → `handleToken0Change`
  - `setAmount1` → `handleToken1Change`
  - `handleMax0/handleMax1` → `handleMax` (단일)
  - `disabled0`, `disabled1` props 추가
- TokenDepositInput에 disabled 상태 전달:
  - `disabled0=true` 시 Token0 input disabled + 값 "0"
  - `disabled1=true` 시 Token1 input disabled + 값 "0"
- Max 버튼: 양쪽 공통 `handleMax` 호출 (개별 Max → 통합 Max)
- Half 버튼: 기존 `handleHalf0/handleHalf1` 유지 (paired 자동계산은 hook에서 처리)

### New Position 페이지 연동
- `useCreatePosition` 반환값에서 새 props를 DepositPanel에 전달

## 2. 완료 조건
- [ ] DepositPanel props에 `handleToken0Change`, `handleToken1Change`, `handleMax`, `disabled0`, `disabled1` 존재
- [ ] out-of-range below 시 Token1 input의 `disabled` DOM 속성 = true
- [ ] out-of-range above 시 Token0 input의 `disabled` DOM 속성 = true
- [ ] Max 버튼이 양쪽 동시 채움 (handleMax 호출)
- [ ] Half 버튼이 해당 토큰 50% + paired 자동계산
- [ ] Total Deposit USD 값이 입력 금액 변경 시 갱신됨
- [ ] Ratio Bar가 양쪽 토큰 비율에 따라 렌더링됨
- [ ] Estimated APR이 표시됨
- [ ] Action Button이 금액 입력 전 "Enter Amount" disabled, 입력 후 활성화
- [ ] `npx tsc --noEmit` 에러 0
- [ ] `cd apps/web && npm run build` 성공
- [ ] `cd apps/web && npm run lint` 통과

## 3. 롤백 방법
- `git restore apps/web/src/domains/trade/components/DepositPanel.tsx`
- New Position 페이지 파일도 restore 필요
- 영향 범위: DepositPanel UI

---

## Scope

### 수정 대상 파일
```
apps/web/src/domains/trade/components/
  └── DepositPanel.tsx         # 수정 - props 변경, disabled 상태, Max 통합

apps/web/src/app/(trade)/pool/[pair]/
  └── page.tsx                 # 수정 - useCreatePosition 반환값을 DepositPanel에 전달 (props 변경 반영)
```

### 신규 생성 파일
없음

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| `DepositPanel.tsx` | 직접 수정 | props 인터페이스 변경 |
| `page.tsx` (pool/[pair]) | 직접 수정 | 새 props 전달 |
| `useCreatePosition.ts` | 참조 | Step 02에서 변경된 반환값 소비 |

### Side Effect 위험
- DepositPanel을 사용하는 다른 곳이 있으면 컴파일 에러 → 확인 필요
- **대응**: DepositPanel은 pool/[pair]/page.tsx에서만 사용됨 (grep 확인)

### 참고할 기존 패턴
- 현재 `DepositPanel.tsx`: 기존 props 구조
- `/Users/mousebook/Documents/side-project/HypurrQuant_FE/apps/web/src/domains/mint/components/SmartDepositInput.tsx`: 참조 UI

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| DepositPanel.tsx | Props 변경 + disabled | ✅ OK |
| page.tsx | 새 props 전달 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| Props 인터페이스 변경 | ✅ | OK |
| disabled0/1 전달 | ✅ | OK |
| Max 통합 | ✅ | OK |
| page.tsx props 전달 | ✅ | OK |

### 검증 통과: ✅

---

→ 완료
