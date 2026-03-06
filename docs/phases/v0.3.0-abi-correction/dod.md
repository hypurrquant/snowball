# DoD (Definition of Done) - v0.3.0

## 기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | `liquity.ts`의 모든 ABI 함수가 `packages/liquity/contracts/src/` 소스와 일치 | Grep으로 함수명 대조 |
| F2 | `lend.ts`의 모든 ABI 함수가 `packages/morpho/src/` 소스와 일치 | Grep으로 함수명 대조 |
| F3 | `options.ts`의 모든 ABI 함수가 `packages/options/src/` 소스와 일치 | Grep으로 함수명 대조 |
| F4 | `dex.ts`에 `increaseLiquidity`, `multicall`, `burn`, `exactInput`, `tickSpacing` 추가됨 | `dex.ts` 파일 내 함수명 확인 |
| F5 | `options.ts`에 `OptionsRelayerABI` 추가됨 (`DOMAIN_SEPARATOR`, `nonces`, `ORDER_TYPEHASH`) | `options.ts` 파일 내 export 확인 |
| F6 | Borrow 페이지 (`borrow/page.tsx`)가 `getEntireBranchColl`, `getEntireBranchDebt`, `lastGoodPrice` 호출 | 파일 내 함수명 Grep |
| F7 | Lend 마켓 (`useLendMarkets.ts`)가 `price` 호출 (not `getPrice`) | 파일 내 함수명 Grep |
| F8 | Options 훅 (`useOptions.ts`)가 `currentRoundId`, `getRound` 호출 | 파일 내 함수명 Grep |
| F9 | Options 페이지 (`options/page.tsx`)가 인자 없는 `deposit()` 호출 | 파일 내 args 확인 |
| F10 | Dead import 0건: `ActivePoolABI`, `OptionsVaultABI`(useOptions), `AdaptiveCurveIRMABI` import 제거됨 | Grep으로 미사용 import 검색 |

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | TypeScript 컴파일 에러 0 | `pnpm --filter @snowball/web exec tsc --noEmit` |
| N2 | Next.js 빌드 성공 | `pnpm --filter @snowball/web build` |
| N3 | `yield.ts` 무변경 (100% 매치 확인됨) | `git diff apps/web/src/abis/yield.ts` 결과 없음 |
| N4 | `abis/index.ts` export 구조 유지 | 5개 파일 모두 re-export |

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | 배포된 컨트랙트가 소스코드와 다른 경우 | ABI는 소스 기준으로 교정, 런타임 revert 시 배포 바이트코드 확인 필요 | `just up` 후 Borrow 페이지 데이터 로딩 확인 |
| E2 | `getLatestTroveData` struct 필드 순서 불일치 | tuple 디코딩 실패로 잘못된 값 표시 | Solidity struct 정의와 ABI tuple components 순서 대조 |
| E3 | `getRound` 반환 struct 필드 불일치 | 동일 | Solidity Round struct와 ABI 대조 |
| E4 | `deposit()` payable 호출 시 value 전달 | `useWriteContract`에서 `value` 파라미터로 CTC 전송 | options/page.tsx의 writeContract 호출 확인 |

## PRD 목표 ↔ DoD 매핑

| PRD 목표 | DoD 항목 | 커버 |
|----------|---------|:---:|
| CRITICAL 16건 수정 | F1, F2, F3, F6, F7, F8, F9 | ✅ |
| HIGH 누락 보완 | F4, F5 | ✅ |
| Dead import 정리 | F10 | ✅ |
| 호출부 동기화 | F6, F7, F8, F9 | ✅ |

## 설계 결정 ↔ DoD 반영

| 설계 결정 | DoD 반영 | 커버 |
|----------|---------|:---:|
| ABI `as const` 패턴 유지 | N1 (타입체크 통과) | ✅ |
| 컨트랙트 소스에서 직접 추출 | F1, F2, F3 | ✅ |
| struct는 tuple components로 | E2, E3 (필드 순서 검증) | ✅ |
| yield.ts 무변경 | N3 | ✅ |
