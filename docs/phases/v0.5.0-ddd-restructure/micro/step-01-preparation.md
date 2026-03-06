# Step 01: 준비 — tsconfig alias + 디렉토리 구조 생성

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: ✅ (git revert)
- **선행 조건**: 없음

---

## 1. 구현 내용 (design.md 기반)
- tsconfig.json에 `@/core/*`, `@/shared/*`, `@/domains/*`, `@/app/*` path alias 추가 (기존 `@/*` 유지)
- 목표 디렉토리 구조 생성 (빈 디렉토리)
- components.json의 ui alias를 `@/shared/components/ui`로 업데이트

## 2. 완료 조건
- [ ] tsconfig.json paths에 4개 alias 존재: `grep -cE '@/(core|shared|domains|app)/\*' apps/web/tsconfig.json` = 4
- [ ] 기존 `@/*` alias 유지: `grep -c '"@/\*"' apps/web/tsconfig.json` = 1
- [ ] 디렉토리 생성: core/abis, core/config, shared/components/ui, shared/components/layout, shared/components/background, shared/components/common, shared/hooks, shared/lib, shared/config, domains/trade/hooks, domains/defi/lend/hooks, domains/defi/lend/lib, domains/defi/yield/hooks, domains/defi/yield/components, domains/options/hooks, domains/options/components
- [ ] components.json ui alias → `@/shared/components/ui`
- [ ] `cd apps/web && npx tsc --noEmit` 통과 (alias 추가만이므로 기존 코드 깨지지 않음)

## 3. 롤백 방법
- `git revert HEAD` (단일 커밋이므로 revert 1회로 복원)

---

## Scope

### 수정 대상 파일
```
apps/web/
├── tsconfig.json         # 수정 — paths에 4개 alias 추가
└── components.json       # 수정 — ui alias 경로 변경
```

### 신규 생성
```
apps/web/src/
├── core/abis/            # 빈 디렉토리
├── core/config/          # 빈 디렉토리
├── shared/components/ui/ # 빈 디렉토리
├── shared/components/layout/
├── shared/components/background/
├── shared/components/common/
├── shared/hooks/
├── shared/lib/
├── shared/config/
├── domains/trade/hooks/
├── domains/defi/lend/hooks/
├── domains/defi/lend/lib/
├── domains/defi/yield/hooks/
├── domains/defi/yield/components/
├── domains/options/hooks/
└── domains/options/components/
```

### Side Effect 위험
- 없음 — 빈 디렉토리 추가와 alias 추가만

## FP/FN 검증
- FP: 없음
- FN: 없음
- 검증 통과: ✅

---

→ 다음: [Step 02: core + shared 이동](step-02-core-shared-move.md)
