# Step 07: E2E 테스트 업데이트

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (파일 추가/삭제/수정)
- **선행 조건**: Step 06 (네비게이션 + 삭제)

---

## 1. 구현 내용 (design.md 기반)
- `e2e/pages/borrow.spec.ts` 삭제 → `e2e/pages/liquity-borrow.spec.ts` 생성 (경로 `/liquity/borrow`, 탭 네비, 트로브 UI 검증)
- `e2e/pages/earn.spec.ts` 삭제 → `e2e/pages/liquity-earn.spec.ts` 생성 (경로 `/liquity/earn`, SP UI 검증)
- `e2e/pages/lend.spec.ts` 삭제 → `e2e/pages/morpho-supply.spec.ts` 생성 (경로 `/morpho/supply`, 마켓 카드 검증)
- `e2e/flows/navigation.spec.ts` 수정: SIDEBAR_LINKS에서 Lend/Borrow/Earn → Liquity/Morpho, 모바일 네비 테스트 업데이트

## 2. 완료 조건
- [ ] `e2e/pages/borrow.spec.ts` 삭제됨
- [ ] `e2e/pages/earn.spec.ts` 삭제됨
- [ ] `e2e/pages/lend.spec.ts` 삭제됨
- [ ] `e2e/pages/liquity-borrow.spec.ts` 존재 — `/liquity/borrow` 경로 테스트
- [ ] `e2e/pages/liquity-earn.spec.ts` 존재 — `/liquity/earn` 경로 테스트
- [ ] `e2e/pages/morpho-supply.spec.ts` 존재 — `/morpho/supply` 경로 테스트
- [ ] `e2e/flows/navigation.spec.ts`에 Lend/Borrow/Earn 미포함, Liquity/Morpho 포함
- [ ] 모바일 네비 테스트에서 Liquity 클릭 → `/liquity/borrow` 이동 (redirect 포함)
- [ ] `cd apps/web && npx playwright test` 종료코드 0

## 3. 롤백 방법
- 삭제 파일 복원 + 추가 파일 삭제 + navigation.spec.ts revert
- 영향 범위: 없음 (테스트만)

---

## Scope

### 삭제 대상 파일
```
apps/web/e2e/pages/borrow.spec.ts        # 삭제
apps/web/e2e/pages/earn.spec.ts          # 삭제
apps/web/e2e/pages/lend.spec.ts          # 삭제
```

### 신규 생성 파일
```
apps/web/e2e/pages/liquity-borrow.spec.ts   # 신규 - Liquity Borrow E2E
apps/web/e2e/pages/liquity-earn.spec.ts     # 신규 - Liquity Earn E2E
apps/web/e2e/pages/morpho-supply.spec.ts    # 신규 - Morpho Supply E2E
```

### 수정 대상 파일
```
apps/web/e2e/flows/navigation.spec.ts    # 수정 - SIDEBAR_LINKS + 모바일 네비 업데이트
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| `e2e/fixtures.ts` | import | test, expect 기반 fixture |
| Step 04 산출물 (Liquity routes) | 테스트 대상 | `/liquity/borrow`, `/liquity/earn` 페이지 |
| Step 05 산출물 (Morpho routes) | 테스트 대상 | `/morpho/supply` 페이지 |
| Step 06 산출물 (Nav 변경) | 테스트 대상 | Liquity/Morpho 네비게이션 |

### Side Effect 위험
- 없음 (테스트 파일만)

### 참고할 기존 패턴
- `e2e/pages/borrow.spec.ts`: 기존 테스트 구조 (같은 패턴으로 재작성)
- `e2e/pages/earn.spec.ts`: 기존 테스트 구조
- `e2e/pages/lend.spec.ts`: 기존 테스트 구조
- `e2e/flows/navigation.spec.ts`: 기존 SIDEBAR_LINKS 패턴

## FP/FN 검증

### False Positive (과잉)
모든 항목이 design.md 테스트 전략과 1:1 매핑 — FP 없음

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| morpho-borrow.spec.ts | 미포함 | ⚠️ design.md에는 morpho-supply만 언급, borrow E2E는 추가 검토 가능하나 최소 범위 유지 |

### 검증 통과: ✅

---

→ 다음: [Step 08: Hint 폴백 테스트](step-08-hint-test.md)
