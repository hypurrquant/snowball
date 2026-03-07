# 작업 티켓 - v0.17.0

## 전체 현황

| # | Step | 난이도 | 롤백 | Scope | FP/FN | 개발 | 완료일 |
|---|------|--------|------|-------|-------|------|--------|
| 01 | [Smart Contracts](step-01-contracts.md) | 🟠 | O | O | O | ⏳ | - |
| 02 | [Core Infrastructure](step-02-core-infra.md) | 🟡 | O | O | O | ⏳ | - |
| 03 | [Bridge Domain Hooks](step-03-bridge-hooks.md) | 🔴 | O | O | O | ⏳ | - |
| 04 | [Bridge UI + Page](step-04-bridge-ui.md) | 🟠 | O | O | O | ⏳ | - |
| 05 | [Contract Deployment + Worker](step-05-deploy.md) | 🟠 | 부분 | O | O | ⏳ | - |
| 06 | [E2E Test](step-06-e2e-test.md) | 🟠 | O | O | O | ⏳ | - |

## 의존성

```
01 ──┐
     ├──→ 05 → 06
02 ──┤
     └──→ 03 → 04
```

- Step 01, 02: 병렬 가능
- Step 03: Step 02 완료 필요
- Step 04: Step 03 완료 필요
- Step 05: Step 01 + Step 02 완료 필요 (배포 + 주소 반영)
- Step 06: Step 05 완료 필요

## 커버리지 매트릭스

### PRD 목표 → 티켓

| PRD 목표 | 관련 티켓 | 커버 |
|----------|----------|------|
| 1. E2E 크로스체인 데모 | Step 01(contracts), 05(deploy), 06(E2E) | O |
| 2. 단일 페이지 멀티체인 UI | Step 02(infra), 03(hooks), 04(UI) | O |
| 3. USC Worker 실제 운영 | Step 05(worker config), 06(E2E test) | O |
| 4. 보안 모델 시연 | Step 01(EvmV1Decoder 검증) | O |

### DoD → 티켓

| DoD 항목 | 관련 티켓 | 커버 |
|----------|----------|------|
| F1: DN Token v2 mint | Step 01, 05 | O |
| F2: DN Token v2 bridgeBurn | Step 01, 05 | O |
| F3: DNBridgeUSC v2 happy path | Step 01, 06 | O |
| F4: DNBridgeUSC v2 revert | Step 01 (forge test) | O |
| F5: BridgeVault deposit | Step 01, 05 | O |
| F6: wagmi 멀티체인 | Step 02 | O |
| F7: PipelineProgress | Step 04 | O |
| F8: ChainDashboard | Step 04 | O |
| F9: CC Testnet approve+deposit | Step 03, 04 | O |
| F10: Sepolia mint+burn | Step 03, 04 | O |
| F11: USC Worker 자동 처리 | Step 05, 06 | O |
| F12: FE Pipeline 완료 감지 | Step 03, 04 | O |
| F13: useChainWriteContract 확장 | Step 02 | O |
| F14: TxStep chainId + explorer | Step 02 | O |
| F15: AutoChainSwitch 비활성화 | Step 02 | O |
| F16: USC Worker config | Step 05 | O |
| F17: 3 contracts deployed | Step 05 | O |
| F18: E2E script 성공 | Step 06 | O |
| N1~N3: tsc/lint/build | Step 02, 03, 04 | O |
| N4: 기존 도메인 호환 | Step 04 | O |
| N5: forge test | Step 01 | O |
| E1~E3: TX 실패 처리 | Step 03, 04 | O |
| E4~E5: 타임아웃/지연 | Step 03, 04 | O |
| E6~E7: 재진입 복구 | Step 03 | O |
| E8: 체인 미등록 | Step 04 | O |
| E9: replay protection | Step 01 (forge test) | O |

### 설계 결정 → 티켓

| 설계 결정 | 관련 티켓 | 커버 |
|----------|----------|------|
| DN Token v2 (public mint) | Step 01 | O |
| DNBridgeUSC v2 (EvmV1Decoder) | Step 01 | O |
| BridgeVault (CC Testnet) | Step 01 | O |
| wagmi 멀티체인 | Step 02 | O |
| AutoChainSwitch 비활성화 | Step 02 | O |
| 재진입 복구 (이벤트 재조회) | Step 03 | O |
| useChainWriteContract 확장 | Step 02 | O |
| TxStep chainId + explorer | Step 02 | O |
| USC Worker config | Step 05 | O |
