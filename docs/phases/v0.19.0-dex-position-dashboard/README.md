# DEX Position Dashboard - v0.19.0

## 문제 정의

### 현상
- 사이드바에 DEX 관련 메뉴로 Swap, Pool(풀 목록/공급)만 존재
- 사용자가 LP 포지션을 생성한 뒤, **내 포지션을 한눈에 조회할 수 있는 페이지가 없음**
- 기존 Dashboard(`/dashboard`)는 토큰 잔고 + Trove/SP 요약만 표시하며, DEX LP 포지션 정보가 누락됨

### 원인
- Pool 페이지는 풀 목록(공급 기회) 중심으로 설계되어 있고, 사용자별 포지션 열거 기능이 구현되지 않음
- NonfungiblePositionManager의 `balanceOf` / `tokenOfOwnerByIndex` / `positions` 호출을 조합하면 온체인에서 사용자 LP를 열거할 수 있지만, 이를 활용하는 hook/UI가 없음

### 영향
- LP 공급 후 포지션 상태(In Range / Out of Range, 미수령 수수료 등) 확인 불가
- 포지션 관리(유동성 추가/제거, 수수료 수령) 진입점 부재
- 전체 LP 포트폴리오 가치를 파악할 수 없어 사용자 경험 저하

### 목표
- 사용자의 **Open(유동성 > 0) Uniswap V3 LP 포지션**을 대시보드에서 조회 가능하게 한다
- 각 포지션의 핵심 지표(풀 페어, 유동성 크기, In/Out of Range 상태, 미수령 수수료)를 표시한다
- 포지션 관리(유동성 추가/제거, 수수료 수령)로 이어지는 진입점을 제공한다
- LP 포트폴리오 전체 가치 요약(Total Net Value)을 CreditcoinOracle 기반 USD로 상단에 표시한다

### 비목표 (Out of Scope)
- Governance token / veToken 홀딩 표시 (프로토콜에 없음)
- Points / 등급 시스템 (프로토콜에 없음)
- Transaction History 탭
- Liquity Trove / Morpho / Yield Vault 포지션 통합 (기존 Dashboard에서 이미 일부 표시)
- APR 계산 (정확한 계산에는 히스토리컬 데이터 필요 — 추후 페이즈)
- Closed(유동성 0) 포지션 표시 (v1에서는 Open만)
- feeGrowth 기반 정밀 수수료 계산 (`tokensOwed`만 사용)

## 제약사항
- 온체인 조회만 사용 (서브그래프/인덱서 없음) — `balanceOf` → `tokenOfOwnerByIndex` → `positions` 순차 호출
- 포지션 수가 많을 경우 RPC 호출 증가 → 최대 20개 포지션으로 제한 (인덱스 0~19, 초과 시 "최대 20개만 표시" 안내 문구)
- USD 가치 계산: CreditcoinOracle의 `price()` (1e36 스케일) 사용. 오라클에 없는 토큰은 TOKEN_INFO.mockPriceUsd fallback (추정치 — UX에 정확도 한계 안내 불필요, 테스트넷)
- 미수령 수수료: `positions().tokensOwed0/tokensOwed1`만 사용 (feeGrowth 정밀 계산은 비목표)
- 기존 DDD 4계층 구조 준수: hook은 `domains/trade/hooks/`, 컴포넌트는 `domains/trade/components/`, 페이지는 `app/(trade)/`
- Creditcoin 테스트넷(chainId: 102031) 환경
