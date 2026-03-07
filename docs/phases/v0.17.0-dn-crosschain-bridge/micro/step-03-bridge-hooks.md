# Step 03: Bridge Domain Hooks

## 메타데이터
- **난이도**: 🔴 어려움
- **롤백 가능**: O (신규 파일 삭제)
- **선행 조건**: Step 02 (체인 config, types, hooks)

---

## 1. 구현 내용 (design.md 기반)

### 3-1. bridgeConfig (`domains/bridge/lib/bridgeConfig.ts`)
- 3개 체인별 publicClient 생성 (독립 RPC)
- 브릿지 컨트랙트 주소/ABI 중앙 관리
- 이벤트 필터 헬퍼 (Deposited, Transfer, BridgeBurn)

### 3-2. useBridgePipeline (`domains/bridge/hooks/useBridgePipeline.ts`)
- 6단계 파이프라인 상태머신: approve → deposit → mint → burn → attestWait → done
- 각 단계별 TxStep 배열 생성
- 재진입 복구: 페이지 로드 시 3개 체인 이벤트 조회 → 현재 단계 자동 감지
- attestation 대기: USC Testnet Transfer(0x0, user) 이벤트 폴링 (10초 간격)
- 타임아웃: 10분 후 지연 안내 상태

### 3-3. useMultiChainBalances (`domains/bridge/hooks/useMultiChainBalances.ts`)
- CC Testnet: USDC 잔액
- Sepolia: DN Token 잔액
- USC Testnet: DN Token 잔액
- 각각 독립 publicClient로 폴링 (15초 간격)

### 3-4. useBridgeActions (`domains/bridge/hooks/useBridgeActions.ts`)
- `approveUSDC(amount)`: CC Testnet에서 USDC approve
- `depositToVault(amount)`: CC Testnet에서 BridgeVault.deposit
- `mintDN(amount)`: Sepolia에서 DNToken.mint
- `burnDN(amount)`: Sepolia에서 DNToken.bridgeBurn
- 각 action에서 useChainWriteContract(targetChainId) 사용

## 2. 완료 조건
- [ ] `domains/bridge/lib/bridgeConfig.ts` 존재, 3개 publicClient 생성
- [ ] `useBridgePipeline` 훅이 6단계 steps 배열 반환
- [ ] `useBridgePipeline` 훅이 페이지 로드 시 이벤트 기반 재진입 복구 수행
- [ ] `useMultiChainBalances` 훅이 3개 체인 잔액 객체 반환
- [ ] `useBridgeActions` 훅이 4개 action 함수 반환
- [ ] TX 실패 시 에러 상태 + 재시도 가능 (E1, E3 커버)
- [ ] attestation 대기 타임아웃(10분) 후 지연 안내 상태 전환 (E4, E5 커버)
- [ ] 재진입 복구: 3개 체인 이벤트 기반 현재 단계 자동 감지 (E6, E7 커버)
- [ ] `pnpm --filter @snowball/web exec tsc --noEmit` 통과

## 3. 롤백 방법
- `rm -rf apps/web/src/domains/bridge/` 로 전체 삭제

---

## Scope

### 신규 생성 파일
```
apps/web/src/domains/bridge/
├── lib/
│   └── bridgeConfig.ts
└── hooks/
    ├── useBridgePipeline.ts
    ├── useMultiChainBalances.ts
    └── useBridgeActions.ts
```

### 의존성
- Step 02의 체인 config, useChainWriteContract, TxStep 타입
- `@snowball/core` bridge ABI + 주소

### 참고할 기존 패턴
- `domains/defi/morpho/hooks/useMorphoActions.ts`: action hook 패턴
- `domains/defi/yield/components/VaultActionDialog.tsx`: TX pipeline 패턴
- `shared/hooks/useTokenApproval.ts`: approve 패턴

## FP/FN 검증

### False Positive (과잉)
없음 — 모든 파일이 구현 내용에 대응

### False Negative (누락)
없음 — E1~E7 에러/타임아웃/재진입 로직이 hooks 완료조건에 반영됨

### 검증 통과: O

---

> 다음: [Step 04: Bridge UI + Page](step-04-bridge-ui.md)
