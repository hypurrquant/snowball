# Snowball Docs Changelog

> 문서 변경 이력
> [INDEX](INDEX.md)

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
