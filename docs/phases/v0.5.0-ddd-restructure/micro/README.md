# 작업 티켓 - v0.5.0 DDD 구조 리팩토링

## 전체 현황

| # | Step | 난이도 | 롤백 | Scope | FP/FN | 개발 | 완료일 |
|---|------|--------|------|-------|-------|------|--------|
| 01 | 준비 (tsconfig + 디렉토리) | 🟢 | ✅ | ✅ | ✅ | ⏳ | - |
| 02 | core/ + shared/ 이동 (35파일) | 🟡 | ✅ | ✅ | ✅ | ⏳ | - |
| 03 | domains/ 이동 + import 갱신 (11파일 + ~140 imports) | 🟠 | ✅ | ✅ | ✅ | ⏳ | - |
| 04 | Cleanup + 최종 검증 | 🟡 | ✅ | ✅ | ✅ | ⏳ | - |

## 의존성

```
01 → 02 → 03 → 04
```

순차 의존 — 각 Step은 이전 Step 완료 후 진행.

## 커버리지 매트릭스

### PRD 목표 → 티켓

| PRD 목표 | 관련 티켓 | 커버 |
|----------|----------|------|
| DDD 4계층 재구성 | Step 01, 02, 03 | ✅ |
| 작업 단계 A: core + shared 추출 | Step 02 | ✅ |
| 작업 단계 B: domains 구분 | Step 03 | ✅ |
| import 경로 업데이트 | Step 03 | ✅ |
| tsc/build 통과 | Step 03, 04 | ✅ |
| 기능 변경 없음 | Step 04 | ✅ |
| (more) 라우트 유지 | Step 04 | ✅ |

### DoD → 티켓

| DoD 항목 | 관련 티켓 | 커버 |
|----------|----------|------|
| F1 (core 8파일) | Step 02 | ✅ |
| F2 (shared 27파일) | Step 02 | ✅ |
| F2a (providers.tsx 존재) | Step 02 | ✅ |
| F3 (trade 3파일) | Step 03 | ✅ |
| F4 (defi/lend 2파일) | Step 03 | ✅ |
| F5 (defi/yield 3파일) | Step 03 | ✅ |
| F6 (options 3파일) | Step 03 | ✅ |
| F7 (기존 디렉토리 삭제) | Step 04 | ✅ |
| F8 (app 구조 불변) | Step 04 | ✅ |
| F9 (tsconfig 4 alias) | Step 01 | ✅ |
| F10 (잔여 old-style 0) | Step 03 | ✅ |
| F11 (components.json) | Step 01 | ✅ |
| N1 (tsc) | Step 03, 04 | ✅ |
| N2 (eslint) | Step 04 | ✅ |
| N3 (build) | Step 03, 04 | ✅ |
| N4 (런타임 불변) | Step 04 | ✅ |
| N5 (git history) | Step 04 | ✅ |
| E1 (core React-free) | Step 04 | ✅ |
| E2 (shared→domains 없음) | Step 04 | ✅ |
| E3 (cross-domain 없음) | Step 04 | ✅ |
| E4 (core relative import) | Step 03 | ✅ |
| E5 (@/* 제거) | Step 04 | ✅ |

### 설계 결정 → 티켓

| 설계 결정 | 관련 티켓 | 커버 |
|----------|----------|------|
| git mv (history 보존) | Step 02, 03 | ✅ |
| tsconfig path alias 4개 | Step 01 | ✅ |
| import 치환 규칙 18패턴 | Step 03 | ✅ |
| shadcn components.json | Step 01 | ✅ |
| 의존성 방향 규칙 | Step 04 | ✅ |
| @/* alias 제거 | Step 04 | ✅ |
| providers.tsx 파일명 유지 | Step 02 | ✅ |

## Step 상세
- [Step 01: 준비](step-01-preparation.md)
- [Step 02: core + shared 이동](step-02-core-shared-move.md)
- [Step 03: domains 이동 + import 갱신](step-03-domains-imports.md)
- [Step 04: Cleanup + 검증](step-04-cleanup-verify.md)
