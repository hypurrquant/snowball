# Pool Dashboard 개선 - v0.6.0

## 문제 정의

### 현상
- `/pool` 페이지가 풀 목록만 나열하는 단순한 테이블 형태
- 프로토콜 전체의 핵심 지표(TVL, 거래량, 수수료)가 보이지 않음
- Trending Pools 같은 하이라이트 섹션이 없어 사용자의 시선을 끌 수 없음
- 풀 테이블에 24h Volume, APR 등 투자 판단에 필요한 정보 부족

### 원인
- 초기 MVP 단계에서 최소 기능만 구현
- 온체인 데이터 외 집계된 통계 데이터(volume, APR 등) 미구축

### 영향
- 사용자가 어떤 풀에 유동성을 공급할지 판단하기 어려움
- 프로토콜의 전체 규모와 활성도를 한눈에 파악할 수 없음
- 경쟁 DEX(Hybra Finance 등) 대비 정보 밀도가 낮음

### 목표
- Hybra Finance `/liquidity` 스타일의 대시보드를 `/pool` 페이지 상단에 추가
- 프로토콜 전체 통계(TVL, 24h Volume, 24h Fees, Pool 수) 카드 표시
- Trending Pools 캐러셀로 인기 풀 하이라이트
- 풀 테이블에 24h Volume, Fees APR 컬럼 추가
- **모든 집계 데이터는 mock으로 처리** (백엔드 미구축 상태)

### 비목표 (Out of Scope)
- 실제 백엔드 API 구축 (indexer, subgraph 등)
- Search, Pool type 필터, Version 탭 (V2/V3/V4)
- Epoch Rewards/Emissions 관련 지표 (Hybra 특화)
- 풀 정렬 기능 (sortable columns)
- 페이지네이션

## 제약사항
- 데이터: BE에서 내려주는 것을 가정한 훅 인터페이스 설계, 내부는 mock 리턴
- 기존 DDD 4계층 구조 준수 (`core ← shared ← domains ← app`)
- 기존 디자인 시스템 활용 (Card, Badge, Button + ice-blue 팔레트)
- 훅 → 페이지 컴포넌트 단방향 의존 (BE 전환 시 훅 내부만 교체)
