# Step 04: Cleanup + 최종 검증

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (git revert)
- **선행 조건**: Step 03

---

## 1. 구현 내용 (design.md 기반)
- 기존 빈 디렉토리 삭제 (abis/, config/, components/, hooks/, lib/)
- tsconfig.json에서 `@/*` alias 제거 (계층 경계 강제)
- 최종 검증: tsc, eslint, build, 의존성 방향, git history

## 2. 완료 조건
- [ ] 기존 디렉토리 삭제: `ls -d apps/web/src/{abis,config,components,hooks,lib} 2>&1 | grep -c "No such"` = 5
- [ ] `@/*` alias 미존재: `grep -c '"@/\*"' apps/web/tsconfig.json` = 0
- [ ] `cd apps/web && npx tsc --noEmit` 통과 (N1)
- [ ] `cd apps/web && npx eslint .` 에러 0 (N2)
- [ ] `cd apps/web && npx next build` 통과 (N3)
- [ ] core에 React 없음: `grep -rn "from ['\"]react" apps/web/src/core/ | wc -l` = 0 (E1)
- [ ] shared→domains 없음: `grep -rn "from ['\"]@/domains" apps/web/src/shared/ | wc -l` = 0 (E2)
- [ ] cross-domain 없음: 도메인별 `grep -rhn ... | grep -v ...` 각 0 (E3)
- [ ] git history 보존: `git log --follow --oneline -3 apps/web/src/shared/lib/utils.ts` 에서 이동 전 커밋 확인 (N5)
- [ ] app/ 구조 불변: `git diff --name-status -- apps/web/src/app/ | grep -E '^[ADR]' | wc -l` = 0 (F8)

## 3. 롤백 방법
- `git revert HEAD` (이 Step만 롤백, `@/*` alias 복원됨)

---

## Scope

### 수정 대상
```
apps/web/
└── tsconfig.json    # 수정 — @/* alias 제거
```

### 삭제 대상
```
apps/web/src/
├── abis/            # 삭제 (빈 디렉토리)
├── config/          # 삭제 (빈 디렉토리)
├── components/      # 삭제 (빈 디렉토리)
├── hooks/           # 삭제 (빈 디렉토리)
└── lib/             # 삭제 (빈 디렉토리)
```

### Side Effect 위험
- `@/*` 제거 시 빠진 import가 있으면 빌드 실패 → tsc로 즉시 검출
- 빈 디렉토리 삭제 시 `.gitkeep` 등 숨김파일 확인 필요

## FP/FN 검증
- FP: 없음
- FN: 없음
- 검증 통과: ✅
