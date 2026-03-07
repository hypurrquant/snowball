# Phase 진행 상황 - v0.17.0

## Codex Session ID
`/Users/mousebook/Documents/side-project/snowball/docs/phases/v0.17.0-dn-crosschain-bridge`

## 현재 단계: Step 5 완료 → Complete 대기

## Phase Steps

| Step | 설명 | 상태 | Codex 리뷰 | 완료일 |
|------|------|------|-----------|--------|
| 1 | PRD (문제 정의) | ✅ 완료 | ✅ 통과 | 2026-03-07 |
| 2 | Design (설계) | ✅ 완료 | ✅ 통과 | 2026-03-07 |
| 3 | DoD (완료 조건) | ✅ 완료 | ✅ 통과 | 2026-03-07 |
| 4 | Tickets (작업 분할) | ✅ 완료 | ✅ 통과 | 2026-03-07 |
| 5 | 개발 | ✅ 완료 | ✅ 통과 (4회차) | 2026-03-07 |

## Micro Steps (개발)

| Step | 설명 | 상태 |
|------|------|------|
| 01 | Smart Contracts | ✅ 완료 (17 forge tests) |
| 02 | Core Infrastructure | ✅ 완료 (tsc pass) |
| 03 | Bridge Domain Hooks | ✅ 완료 (tsc pass) |
| 04 | Bridge UI + Page | ✅ 완료 (tsc pass) |
| 05 | Contract Deployment | ✅ 완료 (3 chains) |
| 06 | E2E Test | ✅ 완료 (4 TX success) |

## 배포 결과

| Contract | Chain | Address |
|----------|-------|---------|
| DN Token v2 | Sepolia | 0xa6722586d0f1cfb2a66725717ed3b99f609cb39b |
| BridgeVault | CC Testnet | 0x06961ab735f87486c538d840d0f54d3f6518cd78 |
| EvmV1Decoder | USC Testnet | 0xa6722586d0f1cFB2a66725717ed3b99F609cb39B |
| DNBridgeUSC v2 | USC Testnet | 0x4fE881D69fB10b8bcd2009D1BC9684a609B29270 |

## 메모
- 2026-03-07: Step 1~4 완료
- 2026-03-07: Step 5 개발 완료
  - Codex 4회 리뷰: destinationChainKey 검증, session anchor, address-scoped storage, deploy script 정리
  - 17 forge tests (wrong chainKey 테스트 추가)
  - E2E: CC deposit + Sepolia mint/burn 자동 검증, USC Worker mint은 수동
