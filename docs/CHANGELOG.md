# Snowball Docs Changelog

> 문서 변경 이력
> [INDEX](INDEX.md)

---

## 2026-03-07 — v0.14.0

### AgentVault Permission Refactor — 관심사 분리 + 토큰별 cap

- **관심사 분리**: `Permission` struct를 `ExecutionPermission` (target+function whitelist) + `TokenAllowance` (토큰별 cap/spent) 로 분리
- **토큰별 cap**: 각 ERC-20 토큰에 대해 개별 spendingCap/spent 관리 (nonce 기반 stale allowance 방지)
- **보안 강화**: `approveFromVault` → `approveAndExecute` (atomic approve-execute-cleanup), `transferFromVault` 목적지 검증 추가
- **신규 함수**: `setTokenAllowances`, `getTokenAllowance`, `getPermNonce`, `approveAndExecute`
- **전체 스택 연동**: Solidity → ABI 3곳 → agent-runtime → 프론트엔드 6파일, 15파일 +625/-222 lines
- 📝 [Phase 문서](archive/v0.14.0-agentvault-permission-refactor/README.md)

---

## 2026-03-07 — v0.12.0

### Agent Production Scheduler — 멀티유저 자동 실행

- **AgentVault V2 컨트랙트**: `getDelegatedUsers(agent)` view 함수 추가 — 특정 에이전트에게 active 권한을 부여한 유저 목록 온체인 조회
- **스케줄러 멀티유저 루프**: `AGENT_CRON_USER` 단일유저 하드코딩 제거, 온체인 유저 목록 기반 유저별 순차 실행
- **troveId 자동 탐색**: `TroveManager.getTroveIdsCount()` → `TroveNFT.ownerOf()` 조합으로 user→troveId 매핑 자동 구축
- **vault.ts expiry 정렬**: observer의 expiry 체크를 컨트랙트와 동일한 `>=` semantics로 통일
- **컨트랙트 재배포**: AgentVault V2 (`0x7d3f7e6b...`) Creditcoin 테스트넷 배포 완료
- 📝 [Phase 문서](archive/v0.12.0-agent-production-scheduler/README.md)

---

## 2026-03-07 — v0.11.0

### Agent Delegation Demo — 확장 가능한 DeFi AI 에이전트 런타임

- **`packages/agent-runtime` 신규**: Observer→Planner→Executor 파이프라인, CapabilityRegistry, AgentManifest 기반 확장 가능 런타임
- **5개 Capability**: morpho.supply, morpho.withdraw, liquity.adjustInterestRate, liquity.addCollateral, vault.rebalance
- **Claude API 기반 Planner**: tool_use로 capability를 도구로 노출, LLM이 실행 계획 생성
- **`apps/agent-server` 신규**: NestJS REST API + Cron 스케줄러, ApiKeyGuard 인증
- **Next.js BFF 프록시**: `/api/agent/run`, `/api/agent/runs` — 서버 사이드 API_KEY 주입
- **Delegation Setup UI**: 3-step 위저드 (Vault Deposit → Permission Grant → Protocol Delegation)
- **DelegationStatus**: Vault/Permission/Morpho/Liquity 4개 상태 실시간 조회
- **RunAgentButton**: Trove ID 입력 지원, 에이전트 1회 실행 + 결과 표시
- **ActivityLog**: 서버 실행 기록 + 온체인 ExecutedOnBehalf 이벤트 병합
- **listExecutable() 강화**: vault permission + 프로토콜 인증(Morpho isAuthorized, Liquity isInterestDelegate/isAddManager) 이중 체크
- **buildCallsAsync**: Liquity hint 비동기 계산 지원
- 📝 [Phase 문서](archive/v0.11.0-agent-delegation-demo/README.md)

---

## 2026-03-06 — v0.11.1

### USC Bridge Worker (오프체인 자동 브릿지 서버)

- **`apps/usc-worker` 신규 패키지**: Sepolia DN Token BridgeBurn 이벤트 감지 → USC 자동 mint 파이프라인
- **6개 모듈**: index(메인 루프), poller(이벤트 감지+교차검증), attestation(USC 증명 대기), proof(Proof API), bridge(mint 실행), config(설정)
- **블록 단위 처리**: 이벤트를 블록별로 그룹핑, 블록 내 모든 이벤트 성공 시에만 포인터 전진 (F10 불변식)
- **BridgeBurn + Transfer 교차 검증**: from/amount/to==address(1) 3중 매칭
- **안전 장치**: MAX_RETRY(10) 초과 시 스킵+복구 안내, 온체인 processedTxKeys 중복 방지
- 📝 [Phase 문서](archive/v0.11.1-usc-worker/README.md)

---

## 2026-03-06 — v0.4.0

### DEX ABI: Algebra V4 → Uniswap V3 전면 마이그레이션

- **dex.ts 전면 리라이트**: SnowballFactory/Pool/Router/DynamicFeePlugin → UniswapV3Factory/Pool, SwapRouter, QuoterV2, NonfungiblePositionManager
- **addresses.ts 정리**: snowballFactory→factory, snowballRouter→swapRouter, 불필요 필드(snowballPoolDeployer, dynamicFeePlugin) 삭제
- **hooks/trade/ 마이그레이션**: usePool(globalState→slot0, poolByPair→getPool+fee), useSwap(deployer/limitSqrtPrice→fee/sqrtPriceLimitX96), useAddLiquidity(deployer→fee)
- **UI 수정**: dynamicFee→fee, fee/10000 표시, "Dynamic Fee"→"Fee Tier"
- **문서 업데이트**: 8개 문서에서 Algebra 참조 제거, SSOT_ALGEBRA.md deprecated 처리
- 📝 [Phase 문서](archive/v0.4.0-dex-uniswap-v3/README.md)

---

## 2026-02-25 — v0.2.0

### 폴더 버전화

- `docs/v0.1.0/` 스냅샷 생성 — 12개 파일 아카이브 복사
- INDEX.md에 Archived Versions 섹션 추가

### DESIGN_OPTIONS.md v0.1.0 → v0.2.0

| 섹션 | 변경 내용 |
|------|-----------|
| Oracle | Pyth/Chainlink → **BTCMockOracle** (AccessControl, OPERATOR_ROLE, packages/oracle/) |
| Backend | Node.js/Express → **Python FastAPI** 통합 서버 (Oracle + Options + Price API) |
| Price API | 신규: `/api/price/btc/*`, `WS /ws/price` 엔드포인트 |
| 배포 로드맵 | FastAPI, BTCMockOracle, Privy 반영 |
| 보안 | 오라클 대응 전략 업데이트 (BTCMockOracle + Binance/CoinGecko 이중 소스) |

### DESIGN_FRONTEND.md v0.1.0 → v0.2.0

| 섹션 | 변경 내용 |
|------|-----------|
| Auth/지갑 | ~~RainbowKit~~ → **Privy** (`@privy-io/react-auth`, `@privy-io/wagmi`) |
| 차트 | Options에 **Lightweight Charts** (TradingView) 추가, 기타 Recharts 유지 |
| 라우트 | `/options`, `/options/vault` 신규 추가 |
| Hooks | `hooks/options/*` (8개), `hooks/price/*` (3개) 신규 |
| 컴포넌트 | `components/options/*` (6개) 신규 |
| ABIs | Options 관련 ABI 4개 추가 |
| 패키지 | 추가: `@privy-io/react-auth`, `@privy-io/wagmi`, `lightweight-charts` / 제거: `@rainbow-me/rainbowkit` |
| 마이그레이션 | Phase 3에 Options UI + WebSocket 훅 추가 |

---

## 2026-02-25 — v0.1.0

### 신규 문서

| 문서 | 버전 | 설명 |
|------|------|------|
| DESIGN_TOKENOMICS.md | v0.1.0 | SNOW/sSNOW 토크노믹스, Revenue Union, Buyback 초안 |
| DESIGN_FRONTEND.md | v0.1.0 | 통합 프론트엔드 IA, 페이지 설계, Hooks, 디자인 시스템 초안 |
| DESIGN_OPTIONS.md | v0.1.0 | BTC 바이너리 옵션, CDP 결제, Meta-tx Relayer 초안 |
| INDEX.md | v1.0.0 | 문서 인덱스 및 버전 추적 시스템 |
| CHANGELOG.md | — | 변경 이력 추적 시작 |

### 버전 헤더 추가

- 전체 10개 문서에 표준 버전 헤더 (`Version: vX.Y.Z | Status: ...`) 적용
- INDEX.md 링크 추가

### 상태 변경

| 문서 | 상태 |
|------|------|
| FRONTEND_HANDOFF.md | Active → Archive |
| FRONTEND_PROMPT.md | Active → Archive |

---

## 2026-02-24

### 신규 문서

| 문서 | 버전 | 설명 |
|------|------|------|
| SSOT_LIQUITY.md | v1.0.0 | Liquity V2 포크 SSOT — 주소, 토큰, 브랜치 |
| SSOT_ERC8004.md | v1.0.0 | ERC-8004 에이전트 시스템 SSOT |

---

## 2026-02-23

### 신규 문서

| 문서 | 버전 | 설명 |
|------|------|------|
| SSOT_MORPHO.md | v1.0.0 | Morpho Blue 포크 SSOT — 주소, 마켓, 오라클 |
| SSOT_ALGEBRA.md | v1.0.0 | DEX SSOT (deprecated → v0.4.0에서 Uniswap V3로 전환) |
| PROJECT_OVERVIEW.md | v1.0.0 | 프로젝트 전체 개요 |
| FRONTEND_HANDOFF.md | v1.0.0 | Gemini 핸드오프용 프론트엔드 스펙 |
| FRONTEND_PROMPT.md | v1.0.0 | 프론트엔드 구현 프롬프트 |
