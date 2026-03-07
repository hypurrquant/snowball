# Yield Vault FE 개선 - v0.22.0

## 문제 정의

### 현상
Yield Vault 페이지의 기본 기능(Deposit/Withdraw)은 구현되어 있으나, MVP 데모 수준에 필요한 핵심 정보와 안전장치가 부족하다.

1. **APY 미표시**: Yield Vault인데 수익률(APY)이 어디에도 표시되지 않음. 사용자가 왜 예치해야 하는지 판단할 수 없다.
2. **USD 환산 없음**: TVL, 예치금이 전부 토큰 원단위(sbUSD, wCTC, USDC)로만 표시. 이종 토큰 볼트의 Total Deposits를 raw sum하여 무의미한 숫자가 나옴.
3. **입력 검증 부재**: 잔고 초과 입력 방지 없음, 숫자가 아닌 값 입력 시 parseEther 크래시 가능, withdraw 시 share 초과 검증 없음.
4. **로딩 UI 미흡**: isLoading 시 StatCard에 "..." 텍스트만 표시, VaultCard는 로딩 상태 자체가 없음.

### 원인
- Yield 페이지가 기능 구현 중심으로 빠르게 만들어졌고, UX/데이터 표현 레이어 다듬기가 후순위였음.
- APY 계산은 전략(Strategy) 유형에 따라 접근 방법이 다르며(Morpho: supply rate 기반, StabilityPool: 청산 이벤트 기반), 통합 로직이 없었음.
- 프론트엔드에 USD 가격 공통 유틸리티가 아직 yield 도메인에 연결되지 않았음.

### 영향
- **사용자**: 수익률을 모르고 예치해야 하므로 의사결정 불가. 잘못된 입력으로 TX revert 가능.
- **데모**: Yield 탭이 다른 프로토콜(DEX, Lend, Borrow) 대비 완성도가 현저히 낮아 보임.
- **MVP 전체**: 5개 프로토콜 중 Yield만 미완성이면 전체 MVP 인상이 떨어짐.

### 목표
1. 각 볼트에 **Est. APY** 표시 — Morpho 볼트는 온체인 supply rate 기반, StabilityPool은 "Variable"
2. TVL/예치금에 **USD 환산** 병행 표시 — 페이지 통계는 USD 합산
3. Deposit/Withdraw **입력 검증** — 잔고/share 초과 방지, safe parsing, disabled button + inline error
4. **로딩 스켈레톤** — 기존 Skeleton 컴포넌트 활용
5. **withdrawAll** — Max 클릭 시 컨트랙트의 withdrawAll() 직접 호출

### 비목표 (Out of Scope)
- 실시간 oracle 가격 조회 (mockPriceUsd 사용, oracle 연동은 후속)
- 서버사이드 APY 히스토리/트레일링 APY (pricePerShare 스냅샷 서버 필요)
- rewardsAvailable 조회 (현재 strategy base가 0 반환)
- Vault 상세 페이지 (개별 볼트 전용 라우트)
- Keeper/harvest 관련 UI (오퍼레이터 전용 기능)
- Options 모듈 관련 작업 (MVP 제외)

## 제약사항
- **기술**: Next.js + wagmi + viem, Shadcn UI, DDD 4계층 아키텍처 준수
- **가격**: TOKEN_INFO.mockPriceUsd 사용 (wCTC=$5, sbUSD=$1, USDC=$1)
- **APY 수수료**: 컨트랙트(SnowballStrategyBase)에 하드코딩된 수수료 상수 — `CALL_FEE=5, STRAT_FEE=5, TREASURY_FEE=35` (합계 45/1000 = 4.5%). APY 계산 시 이 수수료를 차감한 net APY를 표시해야 함
- **wCTC 마켓**: Morpho wCTC 볼트의 supply market은 기존 LEND.markets에 없음 (wCTC가 loanToken인 별도 마켓). 설계 시 이 차이를 고려해야 함

## 사전 논의 메모
Codex와 6라운드 토론을 통해 범위를 파악함. 상세 설계 결정(훅 구조, APY 계산 방식, 입력 검증 패턴)은 design.md에서 다룬다.
