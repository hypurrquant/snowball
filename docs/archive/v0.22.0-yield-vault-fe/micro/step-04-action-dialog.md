# Step 04: VaultActionDialog 입력 검증 + withdrawAll

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅
- **선행 조건**: 없음 (Step 01~03과 독립적)

---

## 1. 구현 내용 (design.md 기반)

### 입력 검증 (useMemo + errors[] 패턴)
- `parseEther`를 `useMemo + try-catch`로 래핑 (기존: render time에서 직접 호출)
- errors 배열 도출:
  - Deposit: `parsedAmount > wantBalance` → "Insufficient balance"
  - Withdraw: `parsedAmount > userShares` → "Exceeds shares"
  - `parsedAmount === 0n && amount !== ""` → "Invalid amount"
- `canSubmit = parsedAmount > 0n && errors.length === 0`
- 에러 메시지 inline 렌더링 (EditTroveDialog 패턴)
- Button `disabled={!canSubmit || !isConnected}`

### withdrawAll 플래그
- `const [isWithdrawAll, setIsWithdrawAll] = useState(false)`
- Max 버튼 클릭 시: `setIsWithdrawAll(true)` + amount를 전체 share로 채움
- amount 수동 수정 시: `setIsWithdrawAll(false)`
- `handleWithdraw`: `isWithdrawAll` → `withdrawAll()` 호출, 아니면 → `withdraw(shares)` 호출

## 2. 완료 조건
- [ ] 잔고 초과 입력 시 "Insufficient balance" 에러 + 버튼 disabled
- [ ] share 초과 입력 시 "Exceeds shares" 에러 + 버튼 disabled
- [ ] "abc" 입력 시 "Invalid amount" 에러 + 버튼 disabled, 크래시 없음
- [ ] 빈 입력("") 시 버튼 disabled, 에러 메시지 없음
- [ ] Max 클릭 → Withdraw → Blockscout TX input selector = `withdrawAll()` (`0x853828b6`)
- [ ] Max 클릭 → 금액 수정 → Withdraw → Blockscout TX input selector = `withdraw(uint256)` (`0x2e1a7d4d`)
- [ ] `npx tsc --noEmit` 통과

## 3. 롤백 방법
- `git revert` — VaultActionDialog.tsx 단일 파일 수정

---

## Scope

### 수정 대상 파일
```
apps/web/src/domains/defi/yield/components/VaultActionDialog.tsx  # 입력 검증 + withdrawAll
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| VaultActionDialog.tsx | 직접 수정 | 검증 로직 추가, withdrawAll 분기 추가 |
| SnowballYieldVaultABI | import 사용 | `withdrawAll` 함수 이미 ABI에 정의되어 있음 |

### Side Effect 위험
- 기존 deposit/withdraw 동작이 변경되지 않아야 함. 검증 로직은 기존 흐름에 guard를 추가하는 것뿐.

### 참고할 기존 패턴
- `apps/web/src/domains/defi/liquity/hooks/useEditTrove.ts` (lines 93-99): useMemo + try-catch + errors[]
- `apps/web/src/domains/defi/liquity/components/EditTroveDialog.tsx` (lines 144-150): 에러 렌더링

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| VaultActionDialog.tsx | 입력 검증 + withdrawAll | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| useMemo safe parsing | ✅ | OK |
| errors[] + canSubmit | ✅ | OK |
| isWithdrawAll 플래그 | ✅ | OK |
| 에러 메시지 UI | ✅ | OK |

### 검증 통과: ✅

---

→ 다음: [Step 05: page.tsx 통합](step-05-page-integration.md)
