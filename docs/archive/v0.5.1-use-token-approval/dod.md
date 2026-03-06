# 완료 조건 (DoD)

## 기능 요건
- [ ] `shared/hooks/useTokenApproval.ts` 생성
- [ ] useSwap.ts에서 approve 로직을 공유 훅으로 교체
- [ ] useAddLiquidity.ts에서 approve 로직을 공유 훅으로 교체
- [ ] VaultActionDialog.tsx에서 approve 로직을 공유 훅으로 교체

## 비기능 요건
- [ ] TypeScript 타입 체크 통과 (`tsc --noEmit`)
- [ ] 기존 동작과 동일 (approve 조건, spender 주소 등)

## 검증 방법
- tsc --noEmit 통과
- 각 파일에서 직접 allowance/approve useReadContract/useWriteContract 호출이 없을 것
