# Step 01: force-dynamic 제거

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: ✅
- **선행 조건**: 없음
- **DoD 매핑**: F1, E1

---

## 1. 구현 내용 (design.md 기반)
- `apps/web/src/app/layout.tsx`에서 `export const dynamic = "force-dynamic"` 행 제거
- 빌드 후 동적 데이터 필요 페이지 발견 시 해당 페이지에 개별 추가 (E1)

## 2. 완료 조건
- [ ] `grep "force-dynamic" apps/web/src/app/layout.tsx` → 결과 없음
- [ ] `cd apps/web && npx tsc --noEmit` 성공 (N1)
- [ ] `cd apps/web && npx next build` 성공 (N3)

## 3. 롤백 방법
- 롤백 절차: `layout.tsx`에 `export const dynamic = "force-dynamic"` 다시 추가
- 영향 범위: 전체 앱 렌더링 전략 (정적 → 동적)

---

## Scope

### 수정 대상 파일
```
apps/web/src/
└── app/layout.tsx  # 수정 - line 7 제거
```

### 신규 생성 파일
없음

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| layout.tsx | 직접 수정 | 1줄 제거 |
| 모든 child routes (15개 페이지) | 간접 영향 | 렌더링 전략 변경 (모두 "use client"이므로 실제 동작 동일) |

### Side Effect 위험
- 위험: force-dynamic 제거 후 특정 페이지에서 빌드 에러 발생 가능
- 대응: `next build`로 검증. 실패 시 해당 페이지에 개별 `export const dynamic = "force-dynamic"` 추가
- 확인 완료: `cookies()`, `headers()` (Next.js 서버 API), `unstable_noStore()` 사용 없음

### 참고할 기존 패턴
- 모든 15개 페이지가 `"use client"` 선언 → SSR 강제 불필요

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| layout.tsx | force-dynamic 제거 대상 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| force-dynamic 제거 | ✅ layout.tsx | OK |
| E1: 개별 페이지 동적 설정 | ✅ next build로 검증 | OK |

### 검증 통과: ✅

---

→ 다음: [Step 02: 네비 공유 상수 추출](step-02-nav-shared.md)
