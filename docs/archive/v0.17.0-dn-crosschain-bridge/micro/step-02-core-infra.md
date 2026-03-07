# Step 02: Core Infrastructure (wagmi + types + hooks)

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: O
- **선행 조건**: 없음 (Step 01과 병렬 가능)

---

## 1. 구현 내용 (design.md 기반)

### 2-1. 체인 정의 추가 (`packages/core/src/config/chain.ts`)
- `sepoliaChain` 정의 (id: 11155111)
- `uscTestnetChain` 정의 (id: 102036)
- `CHAIN_EXPLORERS` 매핑: 102031 → blockscout, 11155111 → etherscan, 102036 → USC explorer

### 2-2. wagmi 멀티체인 (`apps/web/src/shared/config/wagmi.ts`)
- chains 배열에 sepoliaChain, uscTestnetChain 추가
- transports에 Sepolia, USC Testnet RPC 추가

### 2-3. TxStep 타입 확장 (`apps/web/src/shared/types/tx.ts`)
- TxStepType에 `"vaultDeposit" | "bridgeBurn" | "attestWait" | "uscMint"` 추가
- TxStep에 `chainId?: number` 필드 추가

### 2-4. useChainWriteContract 확장 (`apps/web/src/shared/hooks/useChainWriteContract.ts`)
- `targetChainId?: number` 파라미터 추가
- 미지정 시 기존 creditcoinTestnet 동작 유지

### 2-5. AutoChainSwitch 조건부 비활성화 (`apps/web/src/shared/providers.tsx`)
- `/bridge` 경로에서 AutoChainSwitch 비활성화
- `usePathname()` 으로 현재 경로 체크

### 2-6. TxStepItem explorer 링크 (`apps/web/src/shared/components/ui/tx-step-item.tsx`)
- `step.chainId` 기반으로 올바른 explorer URL 선택
- CHAIN_EXPLORERS import

### 2-7. Bridge ABI + 주소 (`packages/core/src/abis/bridge.ts`, `packages/core/src/config/addresses.ts`)
- BridgeVault ABI, DNToken ABI (minimal), DNBridgeUSC ABI (minimal)
- 배포 전 placeholder 주소 → Step 05에서 실제 주소로 교체

## 2. 완료 조건
- [ ] `packages/core/src/config/chain.ts`에 sepoliaChain, uscTestnetChain, CHAIN_EXPLORERS 존재
- [ ] wagmi config에 3개 체인 + 3개 transport 설정
- [ ] TxStepType에 4개 브릿지 타입 추가, TxStep에 chainId 필드 존재
- [ ] `useChainWriteContract(targetChainId?)` 시그니처 동작
- [ ] `/bridge` 경로에서 AutoChainSwitch 비활성화
- [ ] TxStepItem에서 chainId별 explorer URL 분기
- [ ] `pnpm --filter @snowball/web exec tsc --noEmit` 통과

## 3. 롤백 방법
- git checkout으로 수정 파일 원복

---

## Scope

### 수정 대상 파일
```
packages/core/src/config/chain.ts       # 수정 - 체인 추가, CHAIN_EXPLORERS
packages/core/src/config/addresses.ts   # 수정 - BRIDGE 주소 추가
packages/core/src/abis/index.ts         # 수정 - bridge re-export
packages/core/src/index.ts              # 수정 - bridge export
apps/web/src/shared/config/wagmi.ts     # 수정 - 멀티체인
apps/web/src/shared/types/tx.ts         # 수정 - 타입 확장
apps/web/src/shared/hooks/useChainWriteContract.ts  # 수정 - targetChainId
apps/web/src/shared/providers.tsx        # 수정 - AutoChainSwitch 조건부
apps/web/src/shared/components/ui/tx-step-item.tsx  # 수정 - explorer 분기
apps/web/src/core/config/chain.ts       # 수정 - re-export 추가
```

### 신규 생성 파일
```
packages/core/src/abis/bridge.ts        # 신규 - Bridge ABI
apps/web/src/core/abis/bridge.ts        # 신규 - re-export
```

### Side Effect 위험
- wagmi chains 변경: 기존 단일 체인 의존 코드에 영향 없음 (additive)
- useChainWriteContract 시그니처 변경: 기존 호출부는 targetChainId 미지정 → 하위호환
- AutoChainSwitch: `/bridge` 외 경로는 기존 동작 유지

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| chain.ts (core) | 체인 추가, CHAIN_EXPLORERS | OK |
| addresses.ts | BRIDGE 주소 추가 | OK |
| wagmi.ts | 멀티체인 | OK |
| tx.ts | TxStep 확장 | OK |
| useChainWriteContract.ts | targetChainId | OK |
| providers.tsx | AutoChainSwitch 조건부 | OK |
| tx-step-item.tsx | explorer 분기 | OK |
| bridge.ts (ABI) | 신규 ABI | OK |

### False Negative (누락)
없음 — 모든 구현 항목이 Scope에 반영됨

### 검증 통과: O

---

> 다음: [Step 03: Bridge Domain Hooks](step-03-bridge-hooks.md)
