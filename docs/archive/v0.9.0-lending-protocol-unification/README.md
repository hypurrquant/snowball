# Lending Protocol Unification - v0.9.0

## 문제 정의

### 현상
- 사이드바 DeFi 그룹에 Lend/Borrow/Earn/Yield 4개 탭이 **행위 기준**으로 평면 나열되어 있음
- Lend(Morpho Blue)와 Borrow(Liquity V2)가 분리되어 있지만, 실제로는 **두 프로토콜 모두 빌리기+빌려주기를 제공**
- "빌리고 싶은" 유저가 Lend 탭(Morpho borrow)과 Borrow 탭(Liquity openTrove) 중 어디로 가야 하는지 혼란
- Liquity의 Stability Pool(Earn)이 Borrow와 분리되어 같은 프로토콜임을 인지하기 어려움
- **WRITE 기능 대부분 미구현**: Liquity Trove CRUD 미연결, Morpho supply/borrow/repay/withdraw 전무
- **아키텍처 드리프트**: `/borrow`, `/earn` 페이지가 `app/` 레이어에서 직접 `useReadContract`/`useWriteContract`를 호출하여 DDD 4계층 원칙(도메인 로직은 `domains/`에) 위반

### 원인
- 초기 UI 설계 시 **프로토콜 단위가 아닌 행위 단위**로 탭을 구성
- 프로토콜별 기능을 점진적으로 추가하다 보니 Liquity가 2개 탭(Borrow+Earn)으로 분산
- WRITE 트랜잭션 구현보다 READ 대시보드 구현을 우선하여 빌리기/빌려주기 핵심 기능이 누락
- 전용 훅 없이 인라인 컨트랙트 호출로 빠르게 구현하면서 아키텍처 드리프트 누적

### 영향
- **유저 혼란**: 같은 "빌리기" 기능이 2곳에 분산, 탐색 비용 증가
- **프로토콜 스토리 미전달**: Liquity CDP 흐름(담보→대출→상환→종료)이 연결되지 않음
- **데모 임팩트 부족**: 핵심 DeFi 기능(대출/상환)을 시연할 수 없음
- **자금 잠금 위험**: Morpho에 supply하면 withdraw할 수 없는 상태(WRITE 미구현)
- **유지보수 부담**: 도메인 로직이 page 컴포넌트에 산재하여 재사용/테스트 어려움

### 목표

1. **프로토콜 기준 화면 재편**
   - Liquity: `/liquity` 화면에 Borrow(트로브) + Earn(SP) 서브탭으로 통합
   - Morpho: `/morpho` 화면에 Supply + Borrow 서브탭으로 통합
   - 기존 `/borrow`, `/earn`, `/lend` 라우트 → 새 라우트로 대체
   - 사이드바 DeFi 그룹 네비게이션 재구성

2. **Liquity V2 WRITE 전체 구현**
   - `openTrove` (트로브 생성 — 담보 예치 + sbUSD 민팅 + 금리 설정)
   - `adjustTrove` (담보/부채 조정)
   - `adjustTroveInterestRate` (금리 조정)
   - `closeTrove` (트로브 종료)
   - SP: `provideToSP`, `withdrawFromSP`, `claimAllCollGains` (기존 유지)

3. **Liquity V2 READ 보강**
   - 개별 트로브 상세 조회 (`getTroveFromTroveIdsArray`, `getLatestTroveData`, `getCurrentICR`)
   - 트로브 목록 조회 (`getTroveIdsCount`, `getTroveFromTroveIdsArray`)

4. **Morpho Blue WRITE 전체 구현**
   - `supply` (자산 공급)
   - `withdraw` (공급 출금)
   - `supplyCollateral` (담보 공급)
   - `borrow` (자산 차입)
   - `repay` (부채 상환)
   - `withdrawCollateral` (담보 출금)

5. **Morpho Blue READ 보강**
   - 유저 포지션 조회 (`position(marketId, user)`)

6. **프론트엔드 Mock 데이터**
   - 컨트랙트 호출은 실제 테스트넷으로 수행
   - UI 데모를 위한 프론트엔드 fixture 데이터 제공 (예: 다른 유저의 트로브 목록, 마켓 통계 보강)
   - 기존 `wagmi` mock connector 패턴과 일관성 유지

7. **DDD 4계층 정리**
   - `/borrow`, `/earn` 페이지의 인라인 컨트랙트 호출 → `domains/defi/liquity/hooks/`로 이동
   - Morpho 신규 훅 → `domains/defi/morpho/hooks/`에 생성
   - `app/` 레이어는 훅 호출 + UI 렌더링만 담당

### 비목표 (Out of Scope)
- **공통 추상화 레이어**: Liquity/Morpho를 하나의 인터페이스로 추상화하지 않음 (메커니즘 차이가 너무 큼)
- **Yield Vaults 변경**: 이미 완성도 높은 Yield 탭은 이번 Phase에서 변경하지 않음
- **Liquity 고급 기능**: 배치 매니저(registerBatchManager, setRate), Redemption(redeemCollateral), 청산(batchLiquidateTroves)은 제외
- **MetaMorpho Vault**: Morpho 볼트 기능(deposit, mint, withdraw, redeem)은 제외
- **Morpho 고급 기능**: createMarket, liquidate, flashLoan은 제외
- **백엔드 API 변경**: 프론트엔드 전용 Phase
- **Options / DEX 변경**: 다른 프로토콜 탭은 건드리지 않음

## 제약사항
- **테스트넷 전용**: Creditcoin 테스트넷에 배포된 컨트랙트 사용
- **ABI 준비 완료**: 필요한 모든 ABI가 `core/abis/`에 이미 정의되어 있음 (미호출 함수 활용)
- **실제 유저 없음**: 테스트 구간이므로 프론트엔드 fixture로 데모 데이터 제공
- **기존 DDD 구조 유지**: `core/domains/shared/app` 4계층 — 이번 Phase에서 기존 드리프트도 정리
- **기존 shared 컴포넌트 재사용**: StatCard, TokenSelector, VaultActionDialog 패턴 참고
