# Pool New Position (Tick-Based Liquidity UI) - v0.8.0

## 문제 정의

### 현상
- 현재 `/pool/[pair]` 페이지는 단순 프리셋(Full/Safe/Common/Expert) 4개 버튼으로 tick range를 선택
- tick 값(예: -887220, 60000)을 그대로 보여주며, 실제 가격으로 변환하지 않음
- 유동성 분포(liquidity histogram)를 시각화하지 않아 사용자가 어디에 유동성이 집중되어 있는지 알 수 없음
- KittenSwap/Uniswap 등 주요 DEX의 "New Position" UX와 큰 격차 존재

### 원인
- 초기 구현 시 기본 기능(mint 트랜잭션)에만 집중하여 가격 시각화/범위 조정 UI를 생략
- tick ↔ price 변환 유틸리티가 core 레이어에 존재하지 않았음 (v0.8.0 이전 세션에서 `core/dex/calculators.ts` 추가됨)
- 온체인 tick 데이터 fetching 파이프라인 미구현 (mock으로 대체 가능)

### 영향
- **사용자 경험**: LP 포지션 생성 시 적절한 가격 범위를 직관적으로 설정할 수 없음
- **자본 효율성**: 유동성 분포를 모르고 범위를 설정하면 비효율적인 포지션 생성
- **프로토콜 신뢰도**: 경쟁 DEX 대비 열악한 UX로 인한 사용자 이탈 가능성

### 목표
1. KittenSwap의 "Create Position" 화면 구성과 동일한 2컬럼 레이아웃 구현
   - **왼쪽**: Select Range (프리셋 카드 + MIN/MAX/CURRENT 가격 + 유동성 히스토그램)
   - **오른쪽**: Deposit (토큰별 입력 + Half/Max + 토큰 비율 바 + Connect Wallet + Estimated APR)
2. Tick 기반 가격 표시 및 조정
   - tick ↔ price 실시간 변환
   - 드래그 핸들로 범위 조정
   - tickSpacing에 맞춘 스냅
3. 유동성 히스토그램 시각화
   - Mock tick data 기반 (실제 온체인 tick fetching은 향후)
   - 실제 pool state (slot0, liquidity, tickSpacing)는 체인에서 조회
4. HypurrQuant_FE의 `core/dex/` 구조 활용
   - 이미 포팅된 `calculators.ts`, `types.ts` 기반
   - `PriceRangeSelector` 컴포넌트 구조 차용

### 세부 결정사항
- **Estimated APR**: usePoolList에서 token0-token1 매칭되는 풀의 feesAPR 값 표시. 매칭 실패 시 "—" (실제 계산은 향후 Phase)
- **가격 표시 방향**: token0/token1 고정 (반전 토글 없음)
- **가격 소수점**: `formatPriceCompact()` 규칙 — <0.0001 지수표기, <1 유효4자리, <1000 소수4자리, 그 외 소수2자리
- **반응형 레이아웃**: lg 이상 2컬럼, lg 미만 1컬럼 세로 스택 (Select Range → Deposit 순)

### 비목표 (Out of Scope)
- 온체인 tick bitmap/liquidity 실시간 fetching (mock으로 대체)
- Zap Mint (swap + mint 자동 조합)
- Smart Deposit (비율 자동 계산 + 잔고 캡핑)
- Farming/Staking 통합
- Execution Pipeline (approve → swap → mint → farm 오케스트레이션)
- Pool 선택 테이블 (현재 pool list 페이지에서 선택 후 진입하는 플로우 유지)
- 실제 USD 가격 표시 (토큰 USD 가격 피드 미구현)
- APR 실제 계산 (usePoolList.feesAPR 표시만, 실제 온체인 계산은 향후)
- 가격 방향 반전 토글

## 제약사항
- **체인**: Creditcoin 테스트넷 (chainId: 102031) — Uniswap V3 배포
- **데이터**: tick-level liquidity는 mock, pool state(slot0)만 온체인
- **기존 코드**: 이번 세션에서 이미 생성된 파일들이 있음 (calculators.ts, types.ts, usePoolTicks.ts, PriceRangeSelector.tsx, usePool.ts 수정) — 이를 리팩토링하여 활용
- **스타일**: 프로젝트의 ice-blue 팔레트 유지 (KittenSwap의 초록색 테마가 아닌 snowball 디자인 시스템)
- **참조 구현**: HypurrQuant_FE의 mint 시스템 아키텍처 문서 2개를 상세 참고
  - `mint-system-architecture-blueprint.md`
  - `flow-mint-pooldto-visualization-execution.md`
