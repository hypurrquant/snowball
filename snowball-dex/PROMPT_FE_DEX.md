# Snowball DEX — Frontend 개발 지시서

## 목표

Algebra V4 기반 Concentrated Liquidity DEX의 프론트엔드를 구현합니다.
독립 앱으로, Swap / Pool / Positions 3개 주요 페이지를 포함합니다.

---

## 필수 참조 문서

| 문서 | 경로 | 내용 |
|------|------|------|
| **FE 개발 기획서** | `snowball-dex/docs/FE_DESIGN_SPEC.md` | 전체 UI 스펙, 페이지별 상세, 컴포넌트, Hook, 수학 공식 |
| **Algebra SSOT** | `docs/SSOT_ALGEBRA.md` | 컨트랙트 주소, 풀, 함수 시그니처, 빌드 정보 |
| **ABI** | `snowball-dex/src/abis/index.ts` | Factory, Pool, Router, NFT Position Manager, QuoterV2 등 |
| **배포 주소** | `snowball-dex/src/config/addresses.json` | 실제 배포된 컨트랙트 주소 |

---

## 기술 스택

- Next.js 14 + App Router + TypeScript
- Tailwind CSS 3.4 (다크 테마)
- RainbowKit + Wagmi 2 + Viem 2
- TanStack React Query 5
- Network: Creditcoin Testnet (Chain ID: 102031)

---

## 주의사항

1. **ABI는 `src/abis/index.ts`에서 import** — 하드코딩 금지
   ```typescript
   import { SnowballRouterABI, QuoterV2ABI } from "@/abis";
   ```

2. **주소는 `src/config/addresses.json`에서 로딩** — 하드코딩 금지
   ```typescript
   import { CONTRACTS, TOKENS, POOLS } from "@/config/contracts";
   ```

3. **Fee 단위**: 1/100 of a bip (0.0001%). 예: `500 = 0.05%`, `3000 = 0.3%`, `10000 = 1.0%`

4. **sqrtPriceX96 ↔ 실제 가격 변환**:
   ```
   price = (sqrtPriceX96 / 2^96)^2
   ```
   token0/token1의 decimal 차이를 보정해야 함

5. **Tick ↔ 가격 변환**:
   ```
   price = 1.0001^tick
   tick = log(price) / log(1.0001)
   ```

6. **LP 포지션은 ERC-721 NFT** — `NonfungiblePositionManager.positions(tokenId)`로 조회

7. **QuoterV2 호출은 `staticCall`로** — 상태 변경 없이 견적만 조회 (view가 아닌 함수이지만 off-chain 시뮬레이션)

8. **모든 풀은 Dynamic Fee** — 고정 fee tier가 아님. `DynamicFeePlugin.getFee(pool)`로 현재 수수료 조회

9. **토큰 정렬 필수**: Pool은 항상 `token0 < token1` (주소 기준). UI에서 토큰 쌍 표시 시 정렬 주의

10. **4개 초기 풀**: sbUSD/USDC (Stable), wCTC/sbUSD (Major), wCTC/USDC (Major), lstCTC/wCTC (Correlated)

11. **USDC는 decimals=6** — wCTC, lstCTC, sbUSD는 모두 18. amount 계산 시 decimal 차이 주의

12. **Multicall 지원**: Router와 NFT Position Manager 모두 `multicall(bytes[] data)` 지원. 여러 작업을 한 트랜잭션으로 묶을 수 있음

---

## 구현 범위

`FE_DESIGN_SPEC.md`의 전체 내용을 구현:

### 페이지
- `/` — Swap (기본 페이지): 토큰 선택, 금액 입력, 견적 표시, 스왑 실행
- `/pool` — Pool 목록: 4개 풀 TVL, 거래량, 수수료율 표시
- `/pool/[id]` — Pool 상세: 유동성 추가/제거, 가격 차트, 범위 선택
- `/positions` — 내 LP 포지션: NFT 포지션 목록, 수수료 수령, 유동성 관리

### 핵심 Hook
- `useSwap` — QuoterV2 견적 + Router 스왑 실행
- `useAddLiquidity` — NFT Position Manager mint
- `usePool` — Pool 상태 (globalState, liquidity, reserves) 조회
