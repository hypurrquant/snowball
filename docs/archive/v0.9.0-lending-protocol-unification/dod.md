# DoD (Definition of Done) - v0.9.0

## 기능 완료 조건

### 라우트 & 네비게이션 (PRD 목표 1)

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | `/liquity` 접속 시 `/liquity/borrow`로 redirect | 브라우저에서 `/liquity` 접속 → URL이 `/liquity/borrow`로 변경 확인 |
| F2 | `/morpho` 접속 시 `/morpho/supply`로 redirect | 브라우저에서 `/morpho` 접속 → URL이 `/morpho/supply`로 변경 확인 |
| F3 | `/liquity/borrow`, `/liquity/earn` 페이지 정상 렌더링 | 각 경로 접속 시 해당 페이지 콘텐츠 표시, 브라우저 콘솔에 에러 0건 |
| F4 | `/morpho/supply`, `/morpho/borrow` 페이지 정상 렌더링 | 각 경로 접속 시 해당 페이지 콘텐츠 표시, 브라우저 콘솔에 에러 0건 |
| F5 | 기존 `/borrow`, `/earn`, `/lend` 경로 404 반환 | 브라우저에서 각 경로 접속 → Next.js 404 페이지 표시 |
| F6 | 사이드바 DeFi 그룹에 Liquity, Morpho, Yield 3개 항목만 표시 | 데스크톱 사이드바에서 DeFi 섹션 확인 — Lend/Borrow/Earn 미표시 |
| F7 | 사이드바에서 Liquity 클릭 시 `/liquity/borrow`로 이동, active 스타일(ice-400) 적용 | 클릭 후 URL + 텍스트 색상 확인 |
| F8 | Liquity layout에 [Borrow \| Earn] 탭 네비 표시, Earn 탭 클릭 시 `/liquity/earn`으로 이동 | `/liquity/borrow`에서 Earn 탭 클릭 → URL 변경 + Earn 콘텐츠 렌더링 |
| F9 | Morpho layout에 [Supply \| Borrow] 탭 네비 표시, Borrow 탭 클릭 시 `/morpho/borrow`로 이동 | `/morpho/supply`에서 Borrow 탭 클릭 → URL 변경 + Borrow 콘텐츠 렌더링 |

### Liquity V2 — READ (PRD 목표 3)

| # | 조건 | 검증 방법 |
|---|------|----------|
| F10 | `/liquity/borrow`에서 브랜치(wCTC/lstCTC) 전환 시 URL `?branch=` 파라미터 변경 + 데이터 갱신 | wCTC 탭 클릭 → URL `?branch=wCTC`, lstCTC 탭 클릭 → URL `?branch=lstCTC`, 통계 값 변경 |
| F11 | 브랜치별 통계 4개 StatCard 렌더링: 담보 가격, TVL, Total Debt, TCR | 4개 카드가 렌더링되고, 온체인 데이터가 있으면 숫자 표시 / 없으면 "—" placeholder 표시 |
| F12 | 지갑 연결 시 유저 트로브 개수 표시 | 지갑 연결 → 트로브 개수 숫자 렌더링 (0이면 "0", N이면 "N") |
| F13 | 트로브가 있을 때 개별 트로브 카드에 담보, 부채, 금리, ICR 표시 | 트로브 보유 계정 연결 → 각 필드가 렌더링됨 (TEST_MODE fixture로도 검증 가능) |

### Liquity V2 — WRITE (PRD 목표 2)

| # | 조건 | 검증 방법 |
|---|------|----------|
| F14 | openTrove: 담보량+차입량+금리 입력 → approve → 트로브 생성 | 다이얼로그에서 값 입력 → approve tx receipt 성공 → openTrove tx receipt 성공 → 트로브 목록에 신규 트로브 카드 추가됨 |
| F15 | adjustTrove: 담보/부채 변경 후 트로브 상태 반영 | Adjust 다이얼로그 → tx receipt 성공 → 트로브 카드의 담보/부채 값이 변경된 값으로 갱신됨 |
| F16 | adjustTroveInterestRate: 금리 변경 후 트로브에 반영 | 금리 변경 다이얼로그 → tx receipt 성공 → 트로브 카드의 금리 필드가 새 값으로 갱신됨 |
| F17 | closeTrove: 트로브 종료 후 목록에서 제거 | Close 확인 → tx receipt 성공 → 트로브 카드가 목록에서 사라짐 |
| F18 | SP deposit: sbUSD 예치 후 잔고 반영 | 금액 입력 → Deposit → tx receipt 성공 → "Your Deposit" StatCard 값이 입력 금액만큼 증가 |
| F19 | SP withdraw: sbUSD 출금 후 잔고 반영 | 금액 입력 → Withdraw → tx receipt 성공 → "Your Deposit" 값 감소 + sbUSD 잔고 증가 |
| F20 | SP claimAll: 보상 수령 후 Coll. Gain 0으로 리셋 | Claim → tx receipt 성공 → "Coll. Gain" 값이 0으로 변경됨 |

### Morpho Blue — READ (PRD 목표 5)

| # | 조건 | 검증 방법 |
|---|------|----------|
| F21 | `/morpho/supply`에서 3개 마켓 카드 렌더링: 이름, Supply APY, Borrow APR, 이용률 바 | 마켓 카드 3개가 렌더링되고, 각 필드가 온체인 데이터 기반 숫자 또는 "—" placeholder 표시 |
| F22 | `/morpho/borrow`에서 3개 마켓 카드 렌더링 (차입 관점 UI) | 마켓 카드 3개 렌더링, LLTV/Available to borrow 등 차입 관련 필드 표시 |
| F23 | 지갑 연결 시 유저 포지션 표시: supplyAssets, borrowAssets, collateral, healthFactor | 지갑 연결 → 포지션 있으면 값 표시, 없으면 빈 상태 UI (TEST_MODE fixture로도 검증 가능) |

### Morpho Blue — WRITE (PRD 목표 4)

| # | 조건 | 검증 방법 |
|---|------|----------|
| F24 | supply: approve → supply 후 포지션 반영 | 금액 입력 → approve tx receipt 성공 → supply tx receipt 성공 → 유저 supplyAssets 값이 입력 금액만큼 증가 |
| F25 | withdraw: 공급 출금 후 잔고 반영 | Withdraw → tx receipt 성공 → supplyAssets 감소 + 토큰 잔고 증가 |
| F26 | supplyCollateral: approve → 담보 공급 후 포지션 반영 | approve tx receipt 성공 → supplyCollateral tx receipt 성공 → 유저 collateral 값 증가 |
| F27 | borrow: 차입 후 포지션 반영 | 금액 입력 → tx receipt 성공 → borrowAssets 증가 + 토큰 잔고 증가 |
| F28 | repay: approve → 상환 후 포지션 반영 | approve tx receipt 성공 → repay tx receipt 성공 → borrowAssets 감소 |
| F29 | withdrawCollateral: 담보 출금 후 포지션 반영 | tx receipt 성공 → collateral 감소 + 토큰 잔고 증가 |

### Mock Fixture (PRD 목표 6)

| # | 조건 | 검증 방법 |
|---|------|----------|
| F30 | `NEXT_PUBLIC_TEST_MODE=true`일 때 Liquity 페이지에 데모 트로브 데이터 표시 | `.env`에 설정 후 페이지 로드 → fixture 트로브 카드에 `[Demo]` 라벨 렌더링 |
| F31 | `NEXT_PUBLIC_TEST_MODE=true`일 때 Morpho 페이지에 데모 포지션 데이터 표시 | `.env`에 설정 후 페이지 로드 → fixture 포지션에 `[Demo]` 라벨 렌더링 |
| F32 | fixture `[Demo]` 카드의 WRITE CTA 비활성화 | `[Demo]` 카드의 Adjust/Close/Withdraw 버튼이 `disabled` 속성 보유, 클릭 시 무반응 |
| F33 | `NEXT_PUBLIC_TEST_MODE=false` 또는 미설정 시 fixture 미표시 | 환경변수 미설정 → `[Demo]` 라벨 카드 0개 |

### DDD 정리 (PRD 목표 7)

| # | 조건 | 검증 방법 |
|---|------|----------|
| F34 | `app/(defi)/liquity/`, `app/(defi)/morpho/` 페이지에 `useReadContract`/`useWriteContract` 직접 호출 없음 | `rg -n 'use(Read|Write)Contract' 'apps/web/src/app/(defi)/liquity' 'apps/web/src/app/(defi)/morpho'` 결과 0건 |
| F35 | Liquity 도메인 훅 4개 존재 | `ls apps/web/src/domains/defi/liquity/hooks/` → useLiquityBranch.ts, useTroves.ts, useTroveActions.ts, useStabilityPool.ts |
| F36 | Morpho 도메인 훅 3개 존재 | `ls apps/web/src/domains/defi/morpho/hooks/` → useMorphoMarkets.ts, useMorphoPosition.ts, useMorphoActions.ts |
| F37 | 기존 `domains/defi/lend/` 디렉토리 삭제됨 | `test ! -d apps/web/src/domains/defi/lend && echo "OK"` → "OK" 출력 |

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | TypeScript strict 모드 에러 0 | `cd apps/web && npx tsc --noEmit` 종료코드 0 |
| N2 | ESLint 통과 | `pnpm --filter @snowball/web lint` 종료코드 0 |
| N3 | Next.js 빌드 성공 | `pnpm --filter @snowball/web build` 종료코드 0 |
| N4 | WRITE 트랜잭션 실패 시 toast 에러 메시지 표시 | 잔고 초과 금액으로 deposit 시도 → sonner toast가 에러 메시지와 함께 렌더링됨 |
| N5 | `Toaster` 컴포넌트가 `app/layout.tsx`에 마운트됨 | `rg 'Toaster' apps/web/src/app/layout.tsx` → import + JSX 렌더링 확인 |
| N6 | E2E 테스트 통과 | `cd apps/web && npx playwright test` 종료코드 0 |
| N7 | 기존 라우트 E2E 테스트 삭제됨 | `test ! -f apps/web/e2e/pages/borrow.spec.ts && test ! -f apps/web/e2e/pages/earn.spec.ts && test ! -f apps/web/e2e/pages/lend.spec.ts && echo "OK"` |

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | 지갑 미연결 상태에서 `/liquity/borrow` 접속 | 프로토콜 통계 표시 + 모든 WRITE 버튼 disabled + "Connect Wallet" 안내 텍스트 표시 | 지갑 미연결 → WRITE 버튼 클릭 불가 + 안내 텍스트 존재 확인 |
| E2 | 잔고 부족 시 openTrove 시도 | 입력 금액이 잔고 초과 시 Submit 버튼 disabled (트랜잭션 제출 전 클라이언트 검증) | 잔고 0인 토큰으로 금액 입력 → 버튼 disabled 상태 확인 |
| E3 | 트로브 없는 유저가 Borrow 페이지 방문 | "Open Trove" CTA만 표시, Adjust/Close 버튼 미노출 | 트로브 0개 계정 연결 → Adjust/Close 버튼 DOM에 없음 |
| E4 | Morpho supply 후 즉시 withdraw 시도 | 정상 동작 — withdraw tx receipt 성공 + supplyAssets 감소 | supply → withdraw 연속 실행 → 두 tx 모두 receipt 성공 |
| E5 | Morpho borrow 시 healthFactor < 1 되는 금액 입력 | UI에 "Health Factor below 1" 경고 텍스트 표시 + Submit 버튼 disabled | 과도한 차입 금액 입력 → 경고 텍스트 렌더링 + 버튼 disabled |
| E6 | 브랜치(wCTC↔lstCTC) 빠른 전환 | 이전 브랜치 데이터 잔류 없이 새 브랜치 데이터 로드 | 3회 연속 전환 → 마지막 선택 브랜치의 데이터만 표시 |
| E7 | HintHelpers 호출 실패 시 openTrove | (0,0) 힌트로 폴백 후 openTrove 파라미터 정상 구성 | `rg -n 'catch.*0n.*0n|fallback.*hint|hint.*catch' 'apps/web/src/domains/defi/liquity'`로 폴백 분기 존재 확인 + `npx tsx scripts/test-hint-fallback.ts` (repo root에서 실행, hint 계산 순수 함수를 import하여 throw 시 (0n,0n) 반환 검증) |
| E8 | 모바일(375px)에서 Liquity/Morpho 네비게이션 | MobileNav에 Liquity/Morpho/Yield 항목 표시 + 클릭 시 해당 페이지 이동 | 375px 뷰포트 → 햄버거 메뉴 → Liquity 클릭 → `/liquity/borrow` 이동 |

## PRD 목표 ↔ DoD 매핑

| PRD 목표 | DoD 항목 | 커버 |
|----------|---------|------|
| 1. 프로토콜 기준 화면 재편 | F1~F9 | ✅ |
| 2. Liquity WRITE 전체 구현 | F14~F20 | ✅ |
| 3. Liquity READ 보강 | F10~F13 | ✅ |
| 4. Morpho WRITE 전체 구현 | F24~F29 | ✅ |
| 5. Morpho READ 보강 | F21~F23 | ✅ |
| 6. 프론트엔드 Mock 데이터 | F30~F33 | ✅ |
| 7. DDD 4계층 정리 | F34~F37 | ✅ |

## 설계 결정 ↔ DoD 반영

| 설계 결정 | DoD 반영 | 커버 |
|----------|---------|------|
| 중첩 서브라우트 | F1~F4, F8~F9 | ✅ |
| 기존 라우트 삭제 | F5 | ✅ |
| 프로토콜 기준 네비게이션 | F6~F7 | ✅ |
| 프로토콜별 도메인 훅 | F34~F37 | ✅ |
| HintHelpers + (0,0) 폴백 | F14, E7 | ✅ |
| marketParams from config | F24~F29 | ✅ |
| NEXT_PUBLIC_TEST_MODE fixture | F30~F33 | ✅ |
| URL 파라미터 브랜치 셀렉터 | F10, E6 | ✅ |
| Toast 에러 피드백 | N4~N5 | ✅ |
| E2E 테스트 업데이트 | N6~N7 | ✅ |
| fixture [Demo] read-only | F32 | ✅ |
