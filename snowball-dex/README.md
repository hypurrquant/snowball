# Snowball DEX Frontend

Snowball DEX의 프론트엔드 애플리케이션입니다. Creditcoin Testnet 상에서 작동하며, Algebra V4 (Integral) 포크 컨트랙트와 연동되어 유동성 제공(분산화된 유동성) 및 토큰 스왑 기능을 제공합니다.

## 기술 스택
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.4, shadcn/ui (Dark Theme)
- **Web3 Interaction**: Wagmi v2, Viem v2, RainbowKit
- **State Management**: TanStack React Query v5
- **Network**: Creditcoin Testnet (Chain ID: 102031)

## 주요 기능 및 페이지 구조

### 1. 스왑 (Swap) - `/`
- `QuoterV2`를 통한 실시간 예상 수령량 계산
- `SnowballRouter`를 사용한 `exactInputSingle` 토큰 스왑 실행
- 자동화된 ERC20 토큰의 `Approve` 및 스왑 인터페이스

### 2. 풀 (Pool) - `/pool`
- 지원되는 주요 온체인 풀(Pool) 리스트 제공 (wCTC/USDC, wCTC/sbUSD 등)
- 각 풀의 실시간 Dynamic Fee 및 온체인 보유 유동성(LP) 금액 표시

### 3. 풀 상세 및 유동성 관리 - `/pool/[id]`
- 특정 풀의 `globalState` (현재 가격 및 틱) 조회 기능
- 사용자 포지션(NFT) 내 수수료 인출 (Collect Fees) 기능 UI
- 범위 내 유동성(In Range) 표시 컴포넌트 구현

### 4. 유동성 추가 (Add Liquidity) - `/pool/add`
- `NonfungiblePositionManager`의 `mint` 함수와 연동
- 사용자 친화적인 가격 범위(Price Range) 입력 및 자동화된 Tick 계산 통합 UI

### 5. 대시보드 (Analytics) - `/analytics`
- DEX 프로토콜의 주요 지표(TVL, 24시간 거래량, 24시간 수수료, 총 트랜잭션 수) 요약
- 인기 풀 및 인기 토큰 목록 시각화

## 주요 Custom Hooks
- **`useSwap.ts`**: `quoterV2` 견적(Quote) 조회 및 라우터 전송 처리
- **`usePool.ts`**: 특정 두 토큰 간 풀 주소를 찾고 현재 동적 수수료(dynamic fee), 유동성을 읽어옴
- **`useAddLiquidity.ts`**: 지정된 틱(Tick) 범위 안에서 `mint` 요청을 하여 NFT 유동성 포지션 생성

## 실행 방법

1. 패키지 설치
```bash
npm install
```

2. 로컬 개발 서버 실행
```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 로 접속하여 인터페이스를 확인할 수 있습니다.

3. 프로덕션 빌드
```bash
npm run build
npm start
```
