# Step 06: 통합 마무리

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (변경 복원)
- **선행 조건**: Step 05 (볼트 + 권한)

---

## 1. 구현 내용 (design.md 기반)
- 페이지 간 네비게이션 링크 검증 + 보완 (agent → register, agent → [id], [id] → vault 등)
- 에러 핸들링 통합 — tx 실패 시 토스트/에러 메시지 표시
- 로딩 Skeleton 점검/보완 — 모든 READ 훅 사용 페이지에 Skeleton 적용 확인, 미비 시 보완
- empty state 점검/보완 — 에이전트 0개, 리뷰 0개, 권한 0개 시 안내 표시 확인, 미비 시 해당 컴포넌트 보완
- DDD 레이어 검증 — `rg '@/app|from .*app/' apps/web/src/domains/agent/` → 0건
- 최종 빌드 검증 — tsc, lint, build 통과

## 2. 완료 조건
- [ ] 모든 페이지 간 링크가 정상 동작 (agent↔register, agent↔[id], [id]↔vault)
- [ ] tx 실패 시 사용자에게 에러 피드백 표시 (콘솔 에러만이 아닌 UI 피드백)
- [ ] 모든 READ 페이지에서 로딩 Skeleton 표시 (DoD N6)
- [ ] DDD 레이어 위반 없음 (DoD N4)
- [ ] `pnpm --filter @snowball/web exec tsc --noEmit` 에러 없음 (DoD N1)
- [ ] `pnpm --filter @snowball/web lint` 에러 없음 (DoD N2)
- [ ] `pnpm --filter @snowball/web build` 성공 (DoD N3)

## 3. 롤백 방법
- 변경 사항 git 복원

---

## Scope

### 수정 대상 파일
```
apps/web/src/app/(more)/agent/page.tsx                   # 수정 — 링크/에러/스켈레톤 보완
apps/web/src/app/(more)/agent/[id]/page.tsx               # 수정 — 에러 핸들링 보완
apps/web/src/app/(more)/agent/register/page.tsx           # 수정 — 에러 핸들링 보완
apps/web/src/app/(more)/agent/vault/page.tsx              # 수정 — 에러 핸들링 보완
apps/web/src/domains/agent/components/ReputationSection.tsx  # 수정 — 리뷰 0개 empty state 점검/보완
apps/web/src/domains/agent/components/PermissionList.tsx     # 수정 — 권한 0개 empty state 점검/보완
```

### 참고할 기존 패턴
- 기존 페이지들의 에러 처리 패턴 참고

## FP/FN 검증

### 검증 통과: ✅
- 점검/보완 단계로 기존 파일 수정만 수행. 신규 파일 없음.
- 6개 수정 대상: 페이지 4 + 컴포넌트 2 (ReputationSection, PermissionList)

---

→ 완료: Phase Complete
