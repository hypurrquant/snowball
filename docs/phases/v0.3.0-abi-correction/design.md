# 설계 - v0.3.0

## 변경 규모
**규모**: 일반 기능
**근거**: 5개 ABI 파일 + 6개 hooks/pages 파일 수정. 컨트랙트 소스 변경 없음. 내부 API(ABI 인터페이스) 변경.

---

## 문제 요약
프론트엔드 ABI가 실제 컨트랙트와 불일치하여 Borrow/Lend/Options 3개 페이지가 온체인 데이터를 못 읽고 있음. 16건의 잘못된 ABI + 13건의 누락 + 4건의 dead import.

> 상세: [README.md](README.md) 참조
> 감사 리포트: [docs/report/abi-audit.md](../../report/abi-audit.md) 참조

## 접근법

ABI 파일을 컨트랙트 소스코드에서 직접 추출하여 전면 교체. 호출부(hooks/pages)도 동기화.

작업 순서:
1. ABI 파일 수정 (잘못된 함수 교정 + 누락 함수 추가)
2. 호출부 함수명 동기화 (hooks/pages)
3. Dead import 정리
4. 빌드 검증 + 런타임 확인

## 대안 검토

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: ABI 수동 교정 | 정밀 제어, 필요한 함수만 포함 | 수동 작업, 오류 가능 | ✅ |
| B: Hardhat/Foundry artifact에서 전체 ABI 자동 추출 | 완전한 ABI 보장 | 파일 크기 증가, 불필요 함수 포함, 빌드 파이프라인 필요 | ❌ |
| C: wagmi CLI codegen | 타입 안전, 자동화 | 설정 복잡, 현재 프로젝트에 과도 | ❌ |

**선택 이유**: 프로토타입 단계에서 사용하는 함수만 선별적으로 포함하는 A가 가장 실용적. 감사 리포트로 정확한 수정 목록이 이미 확보됨.

## 기술 결정

- ABI는 TypeScript `as const` 형태 유지 (기존 패턴)
- 컨트랙트 소스의 Solidity 함수 시그니처를 직접 참조하여 수기 작성
- struct 반환 함수 (`getLatestTroveData` 등)는 tuple components로 풀어서 정의

---

## 범위 / 비범위

**범위 (In Scope)**:
- `apps/web/src/abis/` 5개 파일 전면 교정
  - `liquity.ts`: 6건 수정, 5건 추가
  - `lend.ts`: 1건 수정, 1건 추가
  - `options.ts`: 6건 수정, 6건 추가 + OptionsRelayerABI 신규
  - `dex.ts`: 3건 추가
  - `yield.ts`: 변경 없음 (100% 매치 확인)
- hooks/pages 호출부 함수명 동기화 (6개 파일)
  - `app/(defi)/borrow/page.tsx`
  - `hooks/defi/useLendMarkets.ts`
  - `hooks/options/useOptions.ts`
  - `app/(options)/options/page.tsx`
- Dead import 정리 (3개 파일)

**비범위 (Out of Scope)**:
- 새 페이지/컴포넌트 구현
- 컨트랙트 소스 수정
- integration 패키지 ABI (SnowballRouter 등) — UI 미존재
- 테스트 작성
- v0.2.1 코드 품질 개선 항목

## 아키텍처 개요

```
apps/web/src/abis/          ← 수정 대상 (5개 파일)
    ├── dex.ts
    ├── lend.ts
    ├── liquity.ts
    ├── options.ts
    └── yield.ts (변경 없음)
         │
         ▼ import
apps/web/src/hooks/          ← 함수명 동기화 대상
    ├── defi/useLendMarkets.ts
    ├── options/useOptions.ts
    └── ...
         │
         ▼ 사용
apps/web/src/app/            ← 함수명 동기화 대상
    ├── (defi)/borrow/page.tsx
    ├── (defi)/earn/page.tsx (변경 없음 — SP ABI 정확)
    └── (options)/options/page.tsx
```

## 파일별 변경 상세

### liquity.ts

| 조치 | 대상 | 변경 내용 |
|------|------|----------|
| 수정 | `TroveManagerABI` | `getEntireSystemColl` → `getEntireBranchColl` |
| 수정 | `TroveManagerABI` | `getEntireSystemDebt` → `getEntireBranchDebt` |
| 삭제 | `TroveManagerABI` | `getTroveEntireColl`, `getTroveEntireDebt`, `getTCR` |
| 수정 | `TroveManagerABI` | `getTroveStatus` 반환 타입 `uint256` → `uint8` |
| 추가 | `TroveManagerABI` | `getLatestTroveData(uint256) → LatestTroveData` struct |
| 추가 | `TroveManagerABI` | `getCurrentICR(uint256,uint256)`, `getTroveIdsCount()`, `getTroveFromTroveIdsArray(uint256)` |
| 삭제 | `BorrowerOperationsABI` | `MIN_ANNUAL_INTEREST_RATE`, `MAX_ANNUAL_INTEREST_RATE` |
| 수정 | `MockPriceFeedABI` | `getPrice` → `lastGoodPrice` |
| 삭제 | `TroveNFTABI` | `tokenOfOwnerByIndex` |
| 추가 | `StabilityPoolABI` | `getDepositorYieldGain(address)`, `getDepositorYieldGainWithPending(address)` |

### lend.ts

| 조치 | 대상 | 변경 내용 |
|------|------|----------|
| 수정 | `MockOracleABI` | `getPrice` → `price` (IOracle 인터페이스) |
| 추가 | `SnowballLendABI` | `idToMarketParams(bytes32)` |

### options.ts

| 조치 | 대상 | 변경 내용 |
|------|------|----------|
| 수정 | `OptionsClearingHouseABI` | `deposit(uint256)` → `deposit()` payable |
| 수정 | `OptionsVaultABI` | `deposit(uint256)` → `deposit()` payable |
| 추가 | `OptionsVaultABI` | `pendingWithdrawShares(address)`, `withdrawUnlockTime(address)`, `availableLiquidity()` |
| 수정 | `SnowballOptionsABI` | `currentRound` → `currentRoundId` |
| 수정 | `SnowballOptionsABI` | `rounds(uint256)` → `getRound(uint256)` + 반환 구조 수정 |
| 추가 | `SnowballOptionsABI` | `getOrder(uint256,uint256)`, `paused()` |
| 수정 | `SnowballOptionsABI` | `RoundStarted` event 시그니처 교정 |
| 수정 | `SnowballOptionsABI` | `OrderSettled` event 시그니처 교정 |
| 신규 | `OptionsRelayerABI` | `DOMAIN_SEPARATOR`, `nonces`, `ORDER_TYPEHASH` |

### dex.ts

| 조치 | 대상 | 변경 내용 |
|------|------|----------|
| 추가 | `NonfungiblePositionManagerABI` | `increaseLiquidity(params)`, `burn(uint256)` |
| 추가 | `SnowballRouterABI` | `exactInput(params)` |
| 추가 | `SnowballPoolABI` | `tickSpacing()` |
| 추가 | `NonfungiblePositionManagerABI`, `SnowballRouterABI` | `multicall(bytes[])` |

### 호출부 동기화

| 파일 | 변경 |
|------|------|
| `borrow/page.tsx` | `getEntireSystemColl` → `getEntireBranchColl`, `getEntireSystemDebt` → `getEntireBranchDebt`, `getPrice` → `lastGoodPrice`, `ActivePoolABI` import 제거 |
| `useLendMarkets.ts` | `getPrice` → `price`, `AdaptiveCurveIRMABI` import 제거 |
| `useOptions.ts` | `currentRound` → `currentRoundId`, `rounds` → `getRound`, `OptionsVaultABI` import 제거 |
| `options/page.tsx` | `deposit` 호출에서 args 제거 (인자 없는 payable) |

## 테스트 전략

| 검증 | 방법 |
|------|------|
| 타입 체크 | `pnpm --filter @snowball/web exec tsc --noEmit` |
| 빌드 | `pnpm --filter @snowball/web build` |
| 런타임 | `just up` 후 Borrow/Lend/Options 페이지에서 데이터 로딩 확인 (Puppeteer 스크린샷) |

## 리스크/오픈 이슈

1. **테스트넷 컨트랙트 상태**: 배포된 컨트랙트가 현재 소스코드와 일치하는지는 확인 불가 (배포 기록만 존재). 소스코드 기준으로 교정하되, 런타임에서 여전히 revert되면 배포된 바이트코드를 확인해야 함.
2. **LatestTroveData struct**: 반환 struct의 필드 순서가 정확해야 ABI 디코딩이 됨. Solidity 소스에서 struct 정의를 직접 참조.
3. **getRound 반환 구조**: Round struct 필드 매핑이 정확해야 함. 소스에서 직접 확인 필요.
