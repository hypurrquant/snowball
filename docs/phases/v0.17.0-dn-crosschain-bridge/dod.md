# DoD (Definition of Done) - v0.17.0

## 기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | DN Token v2가 Sepolia에 배포되어 있고, 임의 주소가 `mint(to, amount)` 호출 시 잔액이 증가한다 | Sepolia etherscan에서 mint TX 성공 확인 + `balanceOf(to)` 조회 |
| F2 | DN Token v2의 `bridgeBurn(amount, chainKey)` 호출 시 `BridgeBurn` 이벤트가 발생하고 토큰이 소각된다 | Sepolia etherscan에서 burn TX 확인 + `balanceOf` 감소 확인 |
| F3 | DNBridgeUSC v2가 USC Testnet에 배포되어 있고, 유효한 proof + 올바른 recipient/amount로 `processBridgeMint` 호출 시 mint가 성공한다 | E2E 수동 테스트: bridgeBurn → USC Worker → processBridgeMint 성공 + USC Testnet에서 `balanceOf(recipient)` 증가 확인 |
| F4 | DNBridgeUSC v2가 변조된 recipient 또는 amount로 `processBridgeMint` 호출 시 revert한다 | forge test: encodedTransaction의 실제 burn 데이터와 불일치하는 recipient/amount 제출 → revert 확인 |
| F5 | BridgeVault가 CC Testnet에 배포되어 있고, `deposit(amount, chainKey)` 호출 시 USDC가 lock되고 `Deposited` 이벤트가 발생한다 | CC Testnet blockscout에서 deposit TX + 이벤트 확인 |
| F6 | wagmi config에 Sepolia(11155111)와 USC Testnet(102036)이 추가되어 있고, 3개 체인 모두 RPC 연결이 된다 | 브라우저에서 `/bridge` 접속 후 3개 체인 잔액 표시 확인 |
| F7 | `/bridge` 페이지에 PipelineProgress 컴포넌트가 6단계(approve → deposit → mint → burn → attestation 대기 → USC mint)를 시각화한다 | 브라우저에서 각 단계 진행 시 UI 상태 전환 확인 |
| F8 | `/bridge` 페이지에 ChainDashboard 컴포넌트가 CC Testnet USDC 잔액, Sepolia DN 잔액, USC Testnet DN 잔액을 실시간 표시한다 | 브라우저에서 TX 전후 잔액 변화 확인 |
| F9 | 사용자가 CC Testnet에서 USDC approve + deposit 2건의 TX를 서명할 수 있다 | 브라우저에서 approve → deposit 순서대로 서명 성공 |
| F10 | deposit 완료 후 Sepolia로 체인 스위치 안내가 표시되고, 전환 후 DN mint + bridgeBurn 2건의 TX를 서명할 수 있다 | 브라우저에서 체인 스위치 → mint → burn 순서대로 서명 성공 |
| F11 | bridgeBurn 후 USC Worker가 BridgeBurn 이벤트를 감지하고, attestation 대기 → proof 생성 → processBridgeMint를 자동 실행한다 | USC Worker 로그에서 전체 흐름 확인 + USC Testnet에서 mint TX 확인 |
| F12 | USC Testnet에서 DN mint가 완료되면 FE가 이를 감지하여 Pipeline을 완료 상태로 표시한다 | 브라우저에서 최종 단계 "완료" 표시 + USC Testnet DN 잔액 증가 확인 |
| F13 | `useChainWriteContract`가 `targetChainId` 파라미터를 받아 지정된 체인에서 TX를 실행한다. 미지정 시 기존 CC Testnet 동작 유지 | `/swap` 페이지에서 스왑 TX 성공 + `/bridge`에서 Sepolia TX 성공 확인 |
| F14 | TxStep에 `chainId` 필드가 추가되고, TX 해시 링크가 해당 체인의 explorer로 연결된다 | bridge 파이프라인에서 CC Testnet TX → blockscout, Sepolia TX → etherscan 링크 확인 |
| F15 | `/bridge` 경로에서 AutoChainSwitch가 비활성화되어, 사용자가 수동으로 체인을 전환할 수 있다 | `/bridge`에서 Sepolia 연결 시 자동으로 CC Testnet으로 전환되지 않음 확인 |
| F16 | USC Worker config(`config.mjs`)가 새 컨트랙트 주소로 모두 업데이트되어 있다: `DN_TOKEN_SEPOLIA`, `DN_BRIDGE_USC`, `DN_TOKEN_DEPLOY_BLOCK` | config.mjs의 3개 값이 새 배포 주소/블록과 일치하는지 diff로 확인 |
| F17 | 3개 컨트랙트가 각 체인에 배포 완료: DN Token v2(Sepolia), DNBridgeUSC v2(USC Testnet), BridgeVault(CC Testnet) | 각 explorer에서 컨트랙트 주소 조회 + 기본 함수 호출 성공 확인 |
| F18 | E2E 파이프라인 스크립트가 전체 흐름(BridgeVault deposit → DN mint → bridgeBurn)을 자동 실행하고 성공한다 | `scripts/simulate-dn-bridge.ts` 실행 → 3개 체인 TX 성공 로그 확인 |

## 비기능 완료 조건

> 범위: `apps/web` + `packages/usc-bridge`. 모노레포 전체 빌드는 이 Phase 범위가 아님.

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | apps/web TypeScript strict 모드 에러 0 | `pnpm --filter @snowball/web exec tsc --noEmit` |
| N2 | apps/web 린트 통과 | `pnpm --filter @snowball/web lint` |
| N3 | apps/web 빌드 성공 | `pnpm --filter @snowball/web build` |
| N4 | 기존 도메인 기능이 깨지지 않는다: `/swap` 페이지 접속 + 토큰 선택 가능, `/borrow` 페이지 접속 + Trove 데이터 로드, `/lend` 페이지 접속 + 마켓 데이터 로드 | 브라우저에서 3개 페이지 각각 접속하여 데이터 렌더링 확인 (TX 실행 불필요) |
| N5 | 컨트랙트 forge test 통과 | `cd packages/usc-bridge && forge test` |

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | USDC approve 또는 deposit TX 실패 (가스 부족, reject 등) | 에러 메시지 표시 + 재시도 버튼 노출, 파이프라인 해당 단계에서 대기 | 브라우저에서 TX 거부 후 UI 상태 확인 |
| E2 | 체인 스위치 요청을 사용자가 거부 | "Sepolia로 전환해주세요" 안내 메시지 유지, 파이프라인 진행 차단 | 브라우저에서 체인 스위치 거부 후 UI 확인 |
| E3 | DN mint 또는 bridgeBurn TX 실패 | 에러 메시지 표시 + 재시도 버튼 노출 | 브라우저에서 TX 거부 후 UI 상태 확인 |
| E4 | USC Worker 미실행 상태에서 bridgeBurn 완료 | "Attestation 대기 중..." 상태 유지, FE 타임아웃(10분) 후 지연 안내 표시 | Worker 미실행 상태에서 burn 후 10분 대기 → 안내 메시지 확인 |
| E5 | Attestation 지연 시 FE 타임아웃 동작 | FE의 attestation 대기 타이머가 만료되면 "네트워크 지연" 안내 + USC Testnet explorer 링크 표시 | FE 타임아웃 값을 30초로 임시 변경 → burn 후 30초 대기 → 지연 안내 UI 확인 → 타임아웃 값 원복 |
| E6 | 파이프라인 중간(deposit 완료, mint 미완)에서 페이지 이탈 후 재진입 | 사용자 주소 기준 온체인 이벤트 재조회로 현재 단계를 자동 감지하여 복구 | deposit만 완료 후 페이지 새로고침 → Step 3(DN mint)부터 재개 확인 |
| E7 | 파이프라인 중간(burn 완료, USC mint 대기)에서 페이지 이탈 후 재진입 | burn 이벤트 감지 → attestation 대기 단계로 복구, USC mint 완료 시 자동 감지 | burn 후 페이지 새로고침 → attestation 대기 상태 복구 확인 |
| E8 | 지갑(MetaMask/injected)에 Sepolia 체인이 추가되지 않은 상태에서 체인 스위치 시도 | wagmi의 `switchChain`이 `wallet_addEthereumChain`을 자동 호출하여 체인 추가 프롬프트 표시. 대상 지갑: MetaMask 등 injected wallet만 (WalletConnect 등은 범위 외) | MetaMask에서 Sepolia 미등록 상태로 스위치 시도 → 체인 추가 프롬프트 확인 |
| E9 | 동일한 bridgeBurn TX에 대해 processBridgeMint가 중복 호출 | DNBridgeUSC v2의 `processedTxKeys` replay protection으로 두 번째 호출이 revert | forge test: 동일 txKey로 processBridgeMint 2회 호출 → 첫 번째 성공, 두 번째 revert 확인 |

## PRD 목표 커버리지

| PRD 목표 | DoD 항목 | 커버 |
|----------|---------|------|
| 1. E2E 크로스체인 데모 | F1~F5(컨트랙트), F9~F12(전체 흐름), F17~F18(배포+E2E) | O |
| 2. 단일 페이지 멀티체인 UI | F6~F8(대시보드), F14~F15(explorer/chain) | O |
| 3. USC Worker 실제 운영 | F11, F16 | O |
| 4. 보안 모델 시연 | F3, F4(on-chain 검증), E9(replay protection) | O |

## 설계 결정 커버리지

| 설계 결정 | DoD 항목 | 커버 |
|----------|---------|------|
| DN Token v2 (public mint) | F1, F2 | O |
| DNBridgeUSC v2 (EvmV1Decoder on-chain 검증) | F3, F4, E9 | O |
| BridgeVault (CC Testnet) | F5 | O |
| wagmi 멀티체인 | F6 | O |
| AutoChainSwitch 비활성화 (/bridge) | F15 | O |
| 재진입 복구 (이벤트 재조회) | E6, E7 | O |
| useChainWriteContract 확장 | F13 | O |
| TxStep chainId + explorer 매핑 | F14 | O |
| USC Worker config 업데이트 | F16 | O |
