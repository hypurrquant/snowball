# OP.md — Snowball DEX Operations Guide

> Algebra V4 기반 DEX (Concentrated Liquidity AMM) 운영 가이드
> Last updated: 2026-02-25

---

## 1. 개요

Snowball DEX는 Algebra V4 포크 기반의 DEX입니다.
- **Concentrated Liquidity** (Uniswap V3 스타일 LP)
- **Dynamic Fee** 플러그인 (변동 수수료)
- **NFT Position Manager** (LP 포지션 = NFT)

| 항목 | 값 |
|------|-----|
| 프레임워크 | Next.js 14 (App Router) |
| 웹3 | wagmi 2 + viem 2 + RainbowKit 2 |
| 네트워크 | Creditcoin Testnet (Chain ID 102031) |
| RPC | `https://rpc.cc3-testnet.creditcoin.network` |
| Explorer | `https://creditcoin-testnet.blockscout.com` |

---

## 2. 실행

```bash
# 루트에서 의존성 설치 (최초 1회)
cd snowball && pnpm install

# 개발 서버 실행
cd snowball-dex
pnpm dev          # http://localhost:3000

# 프로덕션 빌드
pnpm build
pnpm start
```

### 환경 변수

현재 환경 변수 없이 동작합니다. 모든 설정은 코드 내 하드코딩:
- RPC URL: `src/config/chain.ts`
- 컨트랙트 주소: `src/config/addresses.json`

프로덕션 전환 시 `.env.local` 추가 필요:
```env
NEXT_PUBLIC_RPC_URL=https://rpc.cc3-testnet.creditcoin.network
NEXT_PUBLIC_CHAIN_ID=102031
```

---

## 3. 컨트랙트 주소

### Core Contracts

| 컨트랙트 | 주소 |
|----------|------|
| SnowballFactory | `0x04dca03a979b2ad38ee964e8d32c9d36c1301040` |
| SnowballPoolDeployer | `0x71f39dc01dce21358e0733a9981f4b5010312dbb` |
| SnowballRouter | `0x151211ea233c72d466e7c159bf07673771164e4e` |
| DynamicFeePlugin | `0x962267ce45eeef519212243fe8d954b951e31f2c` |
| NonfungiblePositionManager | `0x16534c66e4249ac8cd39a8c91cc80d3f0389a71f` |
| QuoterV2 | `0x36bab7a5dcfb2c4e980dc5bf86009e61a3c35c77` |

### Mock Tokens

| 토큰 | 주소 | Decimals |
|------|------|----------|
| sbUSD | `0x5772f9415b75ecca00e7667e0c7d730db3b29fbd` | 18 |
| wCTC | `0x8f7f60a0f615d828eafcbbf6121f73efcfb56969` | 18 |
| lstCTC | `0x72968ff9203dc5f352c5e42477b84d11c8c8f153` | 18 |
| USDC | `0xbcaa46ef7a399fcdb64adf4520cdcc6d62fcaaed` | 6 |

### Pools

현재 `addresses.json`의 pool 주소는 비어있음. Factory에서 동적으로 조회:
```
factory.poolByPair(token0, token1) → pool address
```

프론트엔드의 4개 기본 풀:
- wCTC / USDC
- wCTC / sbUSD
- sbUSD / USDC
- lstCTC / wCTC

---

## 4. 풀 생성 절차

### 4-1. 새 풀 생성 (컨트랙트)

Algebra V4에서는 Factory를 통해 풀 생성:
```
SnowballFactory.createPool(token0, token1) → pool address
```

> token0 < token1 (주소 기준 정렬) 이어야 합니다. 프론트엔드의 `lib/tokens.ts`에 정렬 유틸리티 있음.

### 4-2. 초기 유동성 공급

1. 풀 생성 후 `pool.initialize(sqrtPriceX96)` 로 초기 가격 설정
2. `NonfungiblePositionManager.mint()` 로 LP 포지션 생성

### 4-3. 프론트엔드에 풀 추가

`src/components/PoolListInterface.tsx`의 `INITIAL_POOLS` 배열에 추가:
```typescript
{ token0: TOKENS.newToken, token1: TOKENS.pairedToken, label: "NEW / PAIR" }
```

---

## 5. 주요 페이지 & 라우트

| 경로 | 설명 | 상태 |
|------|------|------|
| `/` | 스왑 인터페이스 | ✅ 구현 완료 |
| `/pool` | 풀 목록 (수수료, 유동성) | ✅ 구현 완료 |
| `/pool/add` | LP 포지션 생성 | ✅ 구현 완료 |
| `/pool/[id]` | 풀 상세 & 수수료 수집 | ✅ 구현 완료 |
| `/positions` | 내 LP 포지션 | ⚠️ TODO |
| `/analytics` | 프로토콜 통계 | ⚠️ TODO |

---

## 6. 핵심 Hooks

| Hook | 파일 | 기능 |
|------|------|------|
| `useSwap` | `hooks/useSwap.ts` | QuoterV2 견적 + Router exactInputSingle 실행 |
| `useAddLiquidity` | `hooks/useAddLiquidity.ts` | NFT Position Manager mint + 토큰 approve |
| `usePool` | `hooks/usePool.ts` | Factory에서 풀 주소 조회 → globalState/liquidity/fee 읽기 |

---

## 7. 컨트랙트 재배포 시

Algebra 컨트랙트 재배포 후 프론트엔드 업데이트:

1. `src/config/addresses.json` 의 `core` 섹션 주소 갱신
2. 토큰 주소 변경 시 `mockTokens` 섹션도 갱신
3. ABI 변경 시 `src/abis/index.ts` 업데이트
4. dev 서버 재시작 (Next.js HMR은 JSON import를 자동 감지)

---

## 8. 트러블슈팅

### 스왑 실패 "INSUFFICIENT_OUTPUT_AMOUNT"
- 슬리피지 허용치 확인 (기본 0.5%)
- 풀에 충분한 유동성이 있는지 확인
- `quoterV2`로 먼저 견적 확인

### 풀이 목록에 안 보임
- `factory.poolByPair(token0, token1)` 반환값이 0x0이면 풀 미생성
- token0 < token1 순서 확인 (주소 기준)

### "deployer" 관련 에러
- Algebra V4는 모든 풀 쿼리/트랜잭션에 `deployer` 파라미터 필요
- `CONTRACTS.snowballPoolDeployer` 주소 확인

### RainbowKit 지갑 연결 안 됨
- Creditcoin Testnet이 지갑에 추가되었는지 확인
- RPC URL: `https://rpc.cc3-testnet.creditcoin.network`
- Chain ID: `102031`

---

## 9. TODO

### 🔴 HIGH
- [ ] `/positions` 페이지 구현 (내 LP NFT 목록, collect fees)
- [ ] 에러 핸들링 + 토스트 알림 추가
- [ ] 풀 주소 `addresses.json`에 캐시

### 🟡 MEDIUM
- [ ] `/analytics` 대시보드 구현
- [ ] 틱 간격/가격 범위 정밀 입력 UI
- [ ] 멀티홉 스왑 지원 (exactInput with path)

### 🟢 LOW
- [ ] 모바일 반응형 최적화
- [ ] 토큰 목록 동적 관리 (토큰 추가/제거)
- [ ] 환경 변수 기반 설정 전환 (testnet ↔ mainnet)
