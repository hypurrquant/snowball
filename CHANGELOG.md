# Changelog

### v0.24.0 - DDD Layer Refactoring (2026-03-09)
- **Hook Slimming**: 8개 fat hook에서 순수 계산 로직을 `domain/lib/`로 추출 (bridge, liquity, trade, morpho, yield, agent)
- **Layer Hygiene**: `sortTokens`/`parseTokenAmount`/`needsApproval` → `packages/core`, TxStep 타입 → `core/types`, deep import 4건 수정
- **App Page Slimming**: `borrow/page.tsx` 748→442줄, TroveDelegation UI 컴포넌트 분리, useOpenTrovePipeline hook 추출
- **Magic Number Cleanup**: 5개 도메인에 `lib/constants.ts` 생성, 인라인 매직넘버 상수화
- 41 files changed, 374 insertions(+), 1330 deletions(-)
- 📝 [Phase 문서](docs/archive/v0.24.0-ddd-layer-refactoring/README.md)

### v0.10.0 - Agent (ERC-8004) 마켓플레이스 + 볼트 위임 (2026-03-06)
- **에이전트 마켓플레이스**: 전체 에이전트 탐색, 내 에이전트 목록, 프로필 상세 페이지
- **에이전트 등록/관리**: registerAgent, activate/deactivate 토글, 리뷰 작성
- **볼트 위임**: 4개 토큰 예치/출금, 권한 부여(프리셋+커스텀), 권한 목록/취소
- **4개 라우트**: /agent, /agent/[id], /agent/register, /agent/vault
- **8개 훅**: useAgentList, useMyAgents, useAgentProfile, useVaultBalance (READ) + useRegisterAgent, useAgentActions, useSubmitReview, useVaultActions, useVaultPermission (WRITE)
- **DDD 준수**: domains/agent/ 도메인, core/abis/agent.ts ABI, core/config/addresses 주소 통합
- 📝 [Phase 문서](docs/archive/v0.10.0-agent-erc8004/README.md)

### v0.9.0 - Lending Protocol Unification (2026-03-06)
- **프로토콜 기준 화면 재편**: /lend, /borrow, /earn → /liquity (Borrow+Earn) + /morpho (Supply+Borrow)
- **Liquity V2 WRITE 전체 구현**: openTrove, adjustTrove, adjustInterestRate, closeTrove, SP deposit/withdraw/claim
- **Morpho Blue WRITE 전체 구현**: supply, withdraw, supplyCollateral, borrow, repay, withdrawCollateral
- **유저 트로브 조회**: TroveNFT balanceOf + tokenOfOwnerByIndex 패턴
- **트랜잭션 안정성**: waitForTransactionReceipt → position/balance refetch 패턴 통일
- **Fixture mocking**: NEXT_PUBLIC_TEST_MODE 기반 demo 데이터 + [Demo] 뱃지
- **Hint fallback**: getInsertPosition try/catch (0n, 0n) 안전 처리
- 📝 [Phase 문서](docs/archive/v0.9.0-lending-protocol-unification/README.md)

### v0.8.0 - Pool New Position (Tick-Based Liquidity UI) (2026-03-06)
- **2컬럼 레이아웃**: 왼쪽 Select Range + 오른쪽 Deposit Panel (KittenSwap 스타일)
- **PriceRangeSelector**: tick↔price 변환, 프리셋(Full/Safe/Common/Expert), 줌 UI
- **유동성 히스토그램**: mock tick data 기반 Recharts BarChart
- **DepositPanel**: 토큰별 입력, Half/Max, 비율 바, Estimated APR 표시
- **useCreatePosition 훅**: mint 트랜잭션 + 토큰 승인 플로우
- 📝 [Phase 문서](docs/archive/v0.8.0-pool-new-position/README.md)

### v0.7.0 - Swap 가격 차트 (2026-03-06)
- **2컬럼 레이아웃**: 왼쪽 스왑 카드 + 오른쪽 가격 차트 (반응형)
- **Recharts AreaChart**: gradient fill, 토큰 쌍별 동적 차트
- **Mock 가격 데이터**: ~1개월 기간 시계열 데이터
- **PriceChart 컴포넌트**: domains/trade/components/ 분리
- 📝 [Phase 문서](docs/archive/v0.7.0-swap-price-chart/README.md)

### v0.6.0 - Pool Dashboard (2026-03-06)
- **프로토콜 통계**: TVL, 24h Volume, 24h Fees, Pool 수 StatCard
- **풀 목록 테이블**: 24h Volume, Fees APR 컬럼 추가
- **usePoolList / useProtocolStats 훅**: mock 데이터 기반 (BE 전환 대비 인터페이스)
- **풀 상세 페이지**: /pool/[pair] 라우트
- 📝 [Phase 문서](docs/archive/v0.6.0-pool-dashboard/README.md)

### v0.5.0 - DDD 4계층 구조 리팩토링 (2026-03-06)
- **구조 재배치**: flat src/ → core/shared/domains/app 4계층 DDD 아키텍처 적용
- **core (8파일)**: React-free 순수 로직 — abis, config/addresses, config/chain
- **shared (27파일)**: React 포함 공통 기능 — UI 컴포넌트, hooks, lib, layout, providers
- **domains (11파일)**: 비즈니스 로직 — trade, defi/lend, defi/yield, options
- **import 갱신**: ~140개 import 경로를 새 alias(@/core/*, @/shared/*, @/domains/*, @/app/*)로 일괄 변환
- **의존성 규칙 적용**: core←shared←domains←app 단방향, cross-domain import 금지
