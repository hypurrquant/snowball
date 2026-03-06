# Step 05: 색상 토큰 통일

## 메타데이터
- **난이도**: 🟡 보통 (기계적 치환이나 파일 수 많음)
- **롤백 가능**: ✅
- **선행 조건**: 없음
- **DoD 매핑**: F9, E2

---

## 1. 구현 내용 (design.md 기반)
- `apps/web/src` 전체에서 hex 하드코딩을 Tailwind 토큰 클래스로 치환
- 대상 패턴: `text-[#`, `bg-[#`, `border-[#`, `ring-[#`, `from-[#`, `to-[#`, `via-[#`

### 매핑 테이블 (design.md + 추가 발견)

| Hex | Tailwind 토큰 | 클래스 예시 |
|-----|--------------|------------|
| `#60a5fa` | `ice-400` | `text-ice-400`, `bg-ice-400` |
| `#3b82f6` | `ice-500` | `text-ice-500`, `border-ice-500` |
| `#93c5fd` | `ice-300` | `text-ice-300` |
| `#2563eb` | `ice-600` | `text-ice-600` |
| `#8B8D97` | `text-secondary` | `text-text-secondary` |
| `#4A4B57` | `text-tertiary` | `text-text-tertiary` |
| `#F5F5F7` | `text-primary` | `text-text-primary` |
| `#1C1D30` | `bg-input` | `bg-bg-input` |
| `#141525` | `bg-card` | `bg-bg-card` |
| `#0A0B14` | `bg-primary` | `bg-bg-primary` |
| `#0d1117` | `bg-secondary` | `bg-bg-secondary` |
| `#1a2035` | `bg-hover` | `bg-bg-hover` |
| `#1e293b` | `bg-active` | `bg-bg-active` |
| `#1F2037` | `border` | `border-border` |
| `#22c55e` | `success` | `text-success`, `bg-success` |
| `#eab308` | `warning` | `text-warning` |
| `#ef4444` | `danger` | `text-danger` |
| `#8B5CF6` | `violet-500` | `text-violet-500` (Tailwind 내장) |
| `#34D399` | `emerald-400` | `text-emerald-400` (Tailwind 내장) |
| `#F59E0B` | `amber-500` | `text-amber-500` (Tailwind 내장) |
| `#f8fafc` | `slate-50` | `text-slate-50` (Tailwind 내장, gradient 전용) |

### Opacity 변형 처리
- `bg-[#141525]/60` → `bg-bg-card/60` (Tailwind opacity modifier 유지)
- `from-[#60a5fa]/20` → `from-ice-400/20` (gradient opacity 유지)
- `border-[#60a5fa]/40` → `border-ice-400/40`

### Shadow RGBA 패턴
- `shadow-[0_0_15px_rgba(96,165,250,0.2)]` 등은 F9 검증 범위 밖 (`shadow-[...rgba...]` 패턴)
- 기존 globals.css에 shadow 토큰이 정의되어 있으므로, 가능한 범위에서 치환하되 DoD 필수 조건은 아님

## 2. 완료 조건
- [ ] `cd apps/web && grep -rE "text-\[#|bg-\[#|border-\[#|ring-\[#" src/` → 결과 없음 (F9)
- [ ] `cd apps/web && grep -rE "from-\[#|to-\[#|via-\[#" src/` → 결과 없음 (E2)
- [ ] `git diff apps/web/src/app/globals.css`에서 CSS 변수 **값** 변경 없음 (N4)
- [ ] `cd apps/web && npx tsc --noEmit` 성공 (N1)
- [ ] `cd apps/web && npx eslint .` 성공 (N2 — 전체 린트 최종 검증)
- [ ] `cd apps/web && npx next build` 성공 (N3)
- [ ] 브라우저 콘솔에 hydration 경고/에러 없음 — 스모크 체크 (N4)

## 3. 롤백 방법
- 롤백 절차: git checkout으로 전체 복원
- 영향 범위: 전체 UI 색상 (시각적으로 동일해야 함)

---

## Scope

### 수정 대상 파일 (12개)
```
apps/web/src/
├── app/
│   ├── page.tsx                        # 수정 - 21개 hex
│   ├── (defi)/lend/page.tsx            # 수정 - 23개 hex
│   ├── (defi)/borrow/page.tsx          # 수정 - 12개 hex
│   ├── (more)/analytics/page.tsx       # 수정 - 22개 hex
│   ├── (more)/dashboard/page.tsx       # 수정 - 11개 hex
│   ├── (trade)/swap/page.tsx           # 수정 - 18개 hex
│   ├── (trade)/pool/page.tsx           # 수정 - 18개 hex
│   └── (options)/options/page.tsx      # 수정 - 10개 hex
├── components/
│   ├── common/TokenSelector.tsx        # 수정 - 10개 hex
│   └── ui/
│       ├── tooltip.tsx                 # 수정 - 3개 hex
│       ├── dialog.tsx                  # 수정 - 2개 hex
│       └── skeleton.tsx               # 수정 - 1개 hex
```

### 신규 생성 파일
없음

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| 12개 파일 | 직접 수정 | className 문자열 내 hex → 토큰 치환 |
| globals.css | 참조만 | CSS 변수 값 변경 없음 (매핑 소스) |

### Side Effect 위험
- 위험 1: 색상 값 미스매치로 시각적 회귀
  - 대응: globals.css의 CSS 변수 값과 hex 값이 정확히 1:1 매핑됨을 확인 완료. 빌드 성공으로 검증.
- 위험 2: Tailwind 4 내장 색상(violet-500 등)이 globals.css 테마와 충돌
  - 대응: Tailwind 4는 기본 팔레트를 제공하며, 커스텀 테마와 병존 가능. 내장 색상은 `@theme`에 정의되지 않은 이름이므로 충돌 없음.
- 위험 3: opacity modifier 호환성
  - 대응: Tailwind 4에서 `bg-bg-card/60` 형태의 opacity modifier 정상 지원

### 참고할 기존 패턴
- `globals.css` lines 7-41: 모든 CSS 변수 정의
- 이미 토큰 클래스를 사용하는 파일들 (예: `text-text-secondary` 사용처)

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| 12개 파일 모두 | hex 하드코딩 존재 확인됨 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| text-[# 치환 | ✅ 12개 파일 | OK |
| bg-[# 치환 | ✅ 12개 파일 | OK |
| border-[# 치환 | ✅ 12개 파일 | OK |
| ring-[# 치환 | ✅ pool/page.tsx, TokenSelector.tsx | OK |
| from-[#/to-[#/via-[# 치환 | ✅ 해당 파일 | OK |
| 미매핑 hex (#8B5CF6 등) | ✅ Tailwind 내장 색상 사용 | OK |

### 검증 통과: ✅

---

→ 완료 후: 전체 빌드 검증
