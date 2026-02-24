# Snowball App — Lending FE 개발 지시서

## 목표

기존 Snowball App (CDP/Trove UI)에 Morpho Blue 기반 **Lending UI**를 통합 구현합니다.
사이드바에 `/lend` 메뉴를 추가하여 두 프로토콜을 하나의 앱에서 전환할 수 있도록 합니다.

---

## 필수 참조 문서

| 문서 | 경로 | 내용 |
|------|------|------|
| **FE 개발 요청서** | `snowball-app/docs/FE_DESIGN_SPEC_LEND.md` | UI 스펙, 페이지 구조, 컴포넌트, 디자인 시스템, 라우팅 |
| **Morpho SSOT** | `docs/SSOT_MORPHO.md` | 컨트랙트 주소, 마켓, 함수 시그니처, 수학 공식 |
| **Morpho ABI** | `packages/shared/src/abis/morpho.ts` | SnowballLend, Vault, IRM, Oracle ABI |
| **배포 주소** | `deployments/creditcoin-testnet/morpho.json` | 실제 배포된 컨트랙트 주소 |
| **기존 FE 코드** | `snowball-app/packages/app/` | 기존 CDP UI 코드 (동일 스택으로 구현) |

---

## 기술 스택 (기존 App과 동일)

- React 18 + TypeScript + Vite
- Tailwind CSS 3.4 (기존 다크 테마 준수)
- Wagmi 2 + Viem 2
- Privy (Auth)
- TanStack React Query 5
- React Router DOM 6
- Network: Creditcoin Testnet (Chain ID: 102031)

---

## 주의사항

1. **ABI/타입은 `@snowball/shared`에서 import** — 직접 하드코딩 금지
   ```typescript
   import { SnowballLendABI, AdaptiveCurveIRMABI } from "@snowball/shared";
   ```

2. **주소는 `morpho.json`에서 로딩** — 하드코딩 금지
   ```typescript
   import morphoAddresses from "../config/morpho.json";
   ```

3. **기존 디자인 시스템 준수** — `FE_DESIGN_SPEC_LEND.md` 3절의 색상/폰트/CSS 유틸 그대로 사용

4. **SSOT_MORPHO.md의 수학 공식 정확히 구현**
   - Shares ↔ Assets 변환: `VIRTUAL_SHARES = 1e6`, `VIRTUAL_ASSETS = 1`
   - Health Factor: `(collateral × oraclePrice / 1e36 × lltv / 1e18) / borrowedAssets`
   - APR/APY: `borrowRatePerSecond × 365 × 24 × 3600 / 1e18 × 100`

5. **3개 마켓 지원**: wCTC/sbUSD (LLTV 77%), lstCTC/sbUSD (LLTV 80%), sbUSD/USDC (LLTV 86%)

6. **USDC는 decimals=6** — 다른 토큰은 모두 18. 변환 주의

7. **Oracle 가격 스케일은 1e36** — UI에서 표시할 때 적절히 변환 필요

8. **supply/borrow 호출 시 `assets`와 `shares` 중 정확히 하나만 0이 아니어야 함**

9. **`data` 파라미터에 빈 값 전달**: `"0x"` (빈 callback)

---

## 구현 범위

`FE_DESIGN_SPEC_LEND.md`의 전체 내용을 구현:
- `/lend` 대시보드 (마켓 요약 + 유저 포지션)
- `/lend/markets` 마켓 목록
- `/lend/supply` Supply 페이지
- `/lend/borrow` Borrow 페이지
- `/lend/positions` 내 포지션 관리
