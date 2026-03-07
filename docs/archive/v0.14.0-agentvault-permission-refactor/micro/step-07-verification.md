# Step 07: 통합 검증

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: N/A (검증만)
- **선행 조건**: Step 01~06

---

## 1. 구현 내용
- forge build --skip test 최종 확인
- 전체 tsc --noEmit (core, agent-runtime, agent-server, web)
- RPC 검증: getPermNonce, getPermission, getTokenAllowance 호출
- diff 비교: custom/ vs src/ AgentVault.sol 동일 확인
- N3 검증: deposit, withdraw, getBalance 시그니처 미변경 확인

## 2. 완료 조건
- [ ] N1: forge build --skip test 성공
- [ ] N2: 전체 tsc --noEmit 성공
- [ ] N3: deposit, withdraw, getBalance 시그니처 미변경
- [ ] F13: custom/ vs src/ diff 확인
- [ ] F25: RPC 검증 성공

## 3. 롤백 방법
- N/A (검증 단계)

---

## Scope
검증만 수행, 파일 수정 없음

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 포함 근거 | 판정 |
|-----------|----------|------|
| forge build --skip test | N1 — Solidity 컴파일 검증 | ✅ OK |
| tsc --noEmit (4 패키지) | N2 — TypeScript 전체 타입 검증 | ✅ OK |
| RPC 검증 | F25 — 배포 후 view 함수 호출 | ✅ OK |
| diff 비교 | F13 — custom/ vs src/ 동일 확인 | ✅ OK |
| 시그니처 확인 | N3 — deposit/withdraw/getBalance 미변경 | ✅ OK |

### False Negative (누락)
N/A — 검증 전용 step이므로 파일 수정 없음. 모든 검증 대상은 Step 01~06에서 생성.

### 검증 통과: ✅
