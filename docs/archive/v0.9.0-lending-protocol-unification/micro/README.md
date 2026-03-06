# v0.9.0 Micro Steps - 전체 현황

## 의존성 그래프

```
Step 01 (ABI+types+lib)
  ├──→ Step 02 (Liquity hooks) ──→ Step 04 (Liquity routes)
  ├──→ Step 03 (Morpho hooks)  ──→ Step 05 (Morpho routes)
  │                                      ↓
  │                              Step 06 (Nav+cleanup+Toaster) ← Step 04도 선행
  │                                      ↓
  │                              Step 07 (E2E tests)
  └──→ Step 08 (Hint test script)

병렬 가능: Step 02 ∥ Step 03 ∥ Step 08 (선행: Step 01)
병렬 가능: Step 04 ∥ Step 05 (선행: 각각 Step 02, Step 03)
```

## Step 목록

| Step | 이름 | 난이도 | 선행 | 주요 산출물 |
|------|------|--------|------|------------|
| [01](step-01-abi-types.md) | ABI 확장 + 타입/유틸 | 🟡 | 없음 | ABI 2개, types 2개, lib 3개 |
| [02](step-02-liquity-hooks.md) | Liquity 도메인 훅 | 🔴 | 01 | hooks 4개 + fixtures |
| [03](step-03-morpho-hooks.md) | Morpho 도메인 훅 | 🔴 | 01 | hooks 3개 + fixtures |
| [04](step-04-liquity-routes.md) | Liquity 라우트 | 🔴 | 02 | layout + 3 pages |
| [05](step-05-morpho-routes.md) | Morpho 라우트 | 🔴 | 03 | layout + 3 pages |
| [06](step-06-nav-cleanup.md) | Nav + 정리 + Toaster | 🟡 | 04, 05 | nav.tsx 수정, 4 dirs 삭제, Toaster |
| [07](step-07-e2e-tests.md) | E2E 테스트 | 🟡 | 06 | 3 삭제, 3 생성, 1 수정 |
| [08](step-08-hint-test.md) | Hint 폴백 테스트 | 🟢 | 01 | 스크립트 1개 |

## 파일 변경 총계

| 액션 | 개수 | 상세 |
|------|------|------|
| 생성 | 20 | types 2, lib 3, hooks 7, fixtures 2, routes 8 (layout 2 + page 6), E2E 3, script 1 (합산 시 마이너 차이는 디렉토리/파일 카운팅) |
| 수정 | 4 | core/abis/liquity.ts, shared/config/nav.tsx, app/layout.tsx, e2e/flows/navigation.spec.ts |
| 삭제 | 7 | app/(defi)/borrow/, app/(defi)/earn/, app/(defi)/lend/, domains/defi/lend/, e2e/pages/borrow.spec.ts, e2e/pages/earn.spec.ts, e2e/pages/lend.spec.ts |

---

## 커버리지 매트릭스: PRD 목표 → 티켓

| PRD 목표 | 티켓 | 커버 |
|----------|------|------|
| 1. 프로토콜 기준 화면 재편 | Step 04, 05, 06 | ✅ |
| 2. Liquity WRITE 전체 구현 | Step 02, 04 | ✅ |
| 3. Liquity READ 보강 | Step 02, 04 | ✅ |
| 4. Morpho WRITE 전체 구현 | Step 03, 05 | ✅ |
| 5. Morpho READ 보강 | Step 03, 05 | ✅ |
| 6. 프론트엔드 Mock 데이터 | Step 02 (fixtures), 03 (fixtures), 04 (통합), 05 (통합) | ✅ |
| 7. DDD 4계층 정리 | Step 02, 03 (훅 생성), 04, 05 (훅만 사용), 06 (lend/ 삭제) | ✅ |

## 커버리지 매트릭스: DoD → 티켓

### 기능 완료 조건

| DoD | 설명 | 티켓 | 커버 |
|-----|------|------|------|
| F1 | /liquity → redirect | Step 04 | ✅ |
| F2 | /morpho → redirect | Step 05 | ✅ |
| F3 | /liquity/borrow, /liquity/earn 렌더링 | Step 04 | ✅ |
| F4 | /morpho/supply, /morpho/borrow 렌더링 | Step 05 | ✅ |
| F5 | 기존 /borrow, /earn, /lend 404 | Step 06 | ✅ |
| F6 | 사이드바 Liquity/Morpho/Yield | Step 06 | ✅ |
| F7 | Liquity active 스타일 | Step 06 | ✅ |
| F8 | Liquity [Borrow\|Earn] 탭 | Step 04 | ✅ |
| F9 | Morpho [Supply\|Borrow] 탭 | Step 05 | ✅ |
| F10 | 브랜치 전환 + URL 파라미터 | Step 04 | ✅ |
| F11 | 브랜치 통계 4개 StatCard | Step 02 (READ), 04 (UI) | ✅ |
| F12 | 유저 트로브 개수 | Step 02 (READ), 04 (UI) | ✅ |
| F13 | 트로브 상세 카드 | Step 02 (READ), 04 (UI) | ✅ |
| F14 | openTrove WRITE | Step 02 (hook), 04 (dialog) | ✅ |
| F15 | adjustTrove WRITE | Step 02 (hook), 04 (dialog) | ✅ |
| F16 | adjustTroveInterestRate WRITE | Step 02 (hook), 04 (dialog) | ✅ |
| F17 | closeTrove WRITE | Step 02 (hook), 04 (dialog) | ✅ |
| F18 | SP deposit WRITE | Step 02 (hook), 04 (UI) | ✅ |
| F19 | SP withdraw WRITE | Step 02 (hook), 04 (UI) | ✅ |
| F20 | SP claimAll WRITE | Step 02 (hook), 04 (UI) | ✅ |
| F21 | Morpho supply 마켓 카드 3개 | Step 03 (READ), 05 (UI) | ✅ |
| F22 | Morpho borrow 마켓 카드 3개 | Step 03 (READ), 05 (UI) | ✅ |
| F23 | 유저 포지션 표시 | Step 03 (READ), 05 (UI) | ✅ |
| F24 | Morpho supply WRITE | Step 03 (hook), 05 (dialog) | ✅ |
| F25 | Morpho withdraw WRITE | Step 03 (hook), 05 (dialog) | ✅ |
| F26 | Morpho supplyCollateral WRITE | Step 03 (hook), 05 (dialog) | ✅ |
| F27 | Morpho borrow WRITE | Step 03 (hook), 05 (dialog) | ✅ |
| F28 | Morpho repay WRITE | Step 03 (hook), 05 (dialog) | ✅ |
| F29 | Morpho withdrawCollateral WRITE | Step 03 (hook), 05 (dialog) | ✅ |
| F30 | TEST_MODE Liquity fixture | Step 02 (data), 04 (통합) | ✅ |
| F31 | TEST_MODE Morpho fixture | Step 03 (data), 05 (통합) | ✅ |
| F32 | [Demo] WRITE CTA disabled | Step 04, 05 | ✅ |
| F33 | TEST_MODE=false 시 미표시 | Step 04, 05 | ✅ |
| F34 | 페이지에 useReadContract/useWriteContract 없음 | Step 04, 05 | ✅ |
| F35 | Liquity 훅 4개 존재 | Step 02 | ✅ |
| F36 | Morpho 훅 3개 존재 | Step 03 | ✅ |
| F37 | domains/defi/lend/ 삭제 | Step 06 | ✅ |

### 비기능 완료 조건

| DoD | 설명 | 티켓 | 커버 |
|-----|------|------|------|
| N1 | tsc --noEmit 에러 0 | 모든 Step | ✅ |
| N2 | ESLint 통과 | 모든 Step | ✅ |
| N3 | Next.js 빌드 성공 | Step 06 이후 | ✅ |
| N4 | WRITE 실패 시 toast | Step 04 (toast 호출), 05 (toast 호출), 06 (Toaster 마운트 + 화면 검증) | ✅ |
| N5 | Toaster 마운트 | Step 06 | ✅ |
| N6 | E2E 통과 | Step 07 | ✅ |
| N7 | 기존 E2E 삭제 | Step 07 | ✅ |

### 엣지케이스

| DoD | 설명 | 티켓 | 커버 |
|-----|------|------|------|
| E1 | 지갑 미연결 + WRITE disabled | Step 04, 05 | ✅ |
| E2 | 잔고 부족 시 Submit disabled | Step 04 | ✅ |
| E3 | 트로브 0개 시 Open CTA만 표시 | Step 04 | ✅ |
| E4 | supply 후 즉시 withdraw | Step 05 (수동 검증) | ✅ |
| E5 | healthFactor < 1 경고 | Step 05 | ✅ |
| E6 | 브랜치 빠른 전환 | Step 04 | ✅ |
| E7 | Hint 폴백 (0n, 0n) | Step 01 (코드), 08 (테스트) | ✅ |
| E8 | 모바일 네비 | Step 06, 07 | ✅ |

## 커버리지 매트릭스: 설계 결정 → 티켓

| 설계 결정 | 티켓 | 커버 |
|----------|------|------|
| 1. 중첩 서브라우트 | Step 04, 05 | ✅ |
| 2. 프로토콜 기준 도메인 | Step 01, 02, 03 | ✅ |
| 3. 네비게이션 재구성 | Step 06 | ✅ |
| 4. HintHelpers + (0,0) 폴백 | Step 01 (ABI), 02 (hook), 08 (test) | ✅ |
| 5. marketParams from config | Step 01 (lib), 03 (hook) | ✅ |
| 6. NEXT_PUBLIC_TEST_MODE fixture | Step 02, 03 (data), 04, 05 (통합) | ✅ |
| 7. URL 파라미터 브랜치 셀렉터 | Step 04 | ✅ |
| 8. Toast 에러 피드백 | Step 04, 05, 06 (Toaster) | ✅ |

---

## 누락 없음 확인

- PRD 목표 7개 → 모두 커버 ✅
- DoD 기능 37개 → 모두 커버 ✅
- DoD 비기능 7개 → 모두 커버 ✅
- DoD 엣지케이스 8개 → 모두 커버 ✅
- 설계 결정 8개 → 모두 커버 ✅
- design.md 파일 변경 목록 (생성 20, 수정 4, 삭제 7) → 모두 커버 ✅
