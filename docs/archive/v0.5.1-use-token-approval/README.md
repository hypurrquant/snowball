# useTokenApproval 공유 훅 추출 - v0.5.1

## 문제 정의

### 현상
ERC20 approve 로직(allowance 조회 + approve 호출)이 3곳에서 중복:
- `trade/hooks/useSwap.ts`
- `trade/hooks/useAddLiquidity.ts`
- `defi/yield/components/VaultActionDialog.tsx`

### 원인
approve 패턴을 공유 훅으로 추출하지 않고 각 도메인에서 개별 구현

### 영향
- 동일 로직 수정 시 3곳 모두 변경 필요
- approve 관련 버그 발생 시 일관성 없는 동작 가능
- SSOT 원칙 위반

### 목표
- `shared/hooks/useTokenApproval.ts` 공유 훅 생성
- 3곳의 중복 approve 로직을 공유 훅으로 교체

### 비목표 (Out of Scope)
- approve UX 변경 (무한 approve vs 정확한 금액)
- 트랜잭션 상태 토스트/알림 추가
- 다른 도메인 리팩토링
