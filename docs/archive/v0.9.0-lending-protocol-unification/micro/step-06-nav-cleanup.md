# Step 06: 네비게이션 재구성 + 기존 라우트/도메인 삭제 + Toaster

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ⚠️ (삭제 포함 — git revert 가능)
- **선행 조건**: Step 04 (Liquity routes), Step 05 (Morpho routes)

---

## 1. 구현 내용 (design.md 기반)
- `shared/config/nav.tsx` 수정: DeFi 그룹을 Liquity, Morpho, Yield 3개 항목으로 변경
- `app/layout.tsx` 수정: `Toaster` 컴포넌트(sonner) 마운트
- 기존 라우트 삭제: `app/(defi)/borrow/`, `app/(defi)/earn/`, `app/(defi)/lend/`
- 기존 도메인 삭제: `domains/defi/lend/` (morpho/로 마이그레이션 완료)

## 2. 완료 조건
- [ ] 사이드바 DeFi 그룹에 Liquity, Morpho, Yield 3개 항목만 표시
- [ ] Lend, Borrow, Earn 사이드바 항목 미표시
- [ ] 사이드바 Liquity 클릭 → `/liquity/borrow` 이동 + active 스타일 적용
- [ ] 사이드바 Morpho 클릭 → `/morpho/supply` 이동 + active 스타일 적용
- [ ] `/borrow`, `/earn`, `/lend` 접속 시 404
- [ ] `app/(defi)/borrow/` 디렉토리 삭제됨
- [ ] `app/(defi)/earn/` 디렉토리 삭제됨
- [ ] `app/(defi)/lend/` 디렉토리 삭제됨
- [ ] `domains/defi/lend/` 디렉토리 삭제됨
- [ ] `Toaster` 컴포넌트가 `app/layout.tsx`에 마운트됨
- [ ] WRITE 실패 시 toast 에러 메시지 표시 (Liquity + Morpho 페이지에서 검증 — N4)
- [ ] MobileNav에 Liquity/Morpho/Yield 항목 표시 (E8)
- [ ] `cd apps/web && npx tsc --noEmit` 에러 0

## 3. 롤백 방법
- `git revert` 해당 커밋
- 영향 범위: E2E 테스트 (Step 07에서 업데이트)

---

## Scope

### 수정 대상 파일
```
apps/web/src/shared/config/nav.tsx       # 수정 - DeFi 그룹 → Liquity/Morpho/Yield
apps/web/src/app/layout.tsx              # 수정 - Toaster 마운트
```

### 삭제 대상 파일
```
apps/web/src/app/(defi)/borrow/          # 삭제 - page.tsx
apps/web/src/app/(defi)/earn/            # 삭제 - page.tsx
apps/web/src/app/(defi)/lend/            # 삭제 - page.tsx
apps/web/src/domains/defi/lend/          # 삭제 - hooks/useLendMarkets.ts, lib/lendMath.ts
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| `shared/config/nav.tsx` | 직접 수정 | DeFi items 배열 변경 |
| `app/layout.tsx` | 직접 수정 | Toaster import + JSX 추가 |
| `app/(defi)/borrow/page.tsx` | 삭제 | Step 04 Liquity routes가 대체 |
| `app/(defi)/earn/page.tsx` | 삭제 | Step 04 Liquity routes가 대체 |
| `app/(defi)/lend/page.tsx` | 삭제 | Step 05 Morpho routes가 대체 |
| `domains/defi/lend/` | 삭제 | Step 01+03 Morpho domain이 대체 |
| `shared/components/layout/Sidebar.tsx` | 간접 영향 | nav.tsx 변경 자동 반영 |
| `shared/components/layout/Header.tsx` | 간접 영향 | MobileNav에 nav.tsx 변경 자동 반영 |
| `shared/components/ui/sonner.tsx` | import 대상 | Toaster 컴포넌트 |

### Side Effect 위험
- **삭제 후 import 깨짐**: `domains/defi/lend/` 삭제 전 다른 파일에서 import하는지 확인 필요
  - `rg "from.*domains/defi/lend" apps/web/src/` 결과가 삭제 대상 파일에만 있어야 함
- **nav.tsx 변경**: Sidebar/MobileNav가 `NAV_GROUPS`를 import하므로 자동 반영

### 참고할 기존 패턴
- `shared/config/nav.tsx`: 현재 구조 그대로 수정
- `shared/components/ui/sonner.tsx`: 이미 존재하는 Toaster export 확인

## FP/FN 검증

### False Positive (과잉)
모든 항목이 design.md 파일 변경 목록과 1:1 매핑 — FP 없음

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| lend/ 삭제 시 다른 곳 import 확인 | 의존성 분석에 포함 | ✅ OK |
| Toaster import 경로 확인 | sonner.tsx 확인 | ✅ OK |

### 검증 통과: ✅

---

→ 다음: [Step 07: E2E 테스트 업데이트](step-07-e2e-tests.md)
