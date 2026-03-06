# Step 04: WRITE 훅 + 등록/리뷰/활성화

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅ (파일 삭제)
- **선행 조건**: Step 03 (마켓플레이스 UI)

---

## 1. 구현 내용 (design.md 기반)
- `useRegisterAgent.ts` — registerAgent WRITE + AgentRegistered 이벤트 파싱 → agentId 반환
- `useAgentActions.ts` — activateAgent/deactivateAgent WRITE
- `useSubmitReview.ts` — submitReview WRITE ("general" 태그 고정)
- `/agent/register` 페이지 신규 — 등록 폼 (name, agentType, endpoint, tokenURI)
- `ReviewForm.tsx` — 별점(1~5) + 코멘트 작성 폼
- `/agent/[id]` 페이지에 activate/deactivate 토글 + ReviewForm 통합

## 2. 완료 조건
- [ ] `/agent/register` 에서 폼 입력 → registerAgent tx 성공 (DoD F10)
- [ ] 등록 후 agentId 파싱하여 `/agent/[id]`로 리다이렉트 (DoD F11)
- [ ] `/agent/[id]`에서 소유자만 activate/deactivate 토글 표시 (DoD F12, E5)
- [ ] `/agent/[id]`에서 리뷰 제출 → submitReview tx 성공 (DoD F13)
- [ ] 리뷰 제출 시 "general" 태그 자동 사용 (DoD F14)
- [ ] `/agent/register`는 지갑 미연결 시 "Connect wallet" 안내 (DoD N5)
- [ ] `pnpm --filter @snowball/web exec tsc --noEmit` 에러 없음

## 3. 롤백 방법
- 신규 훅/컴포넌트/페이지 삭제 + `/agent/[id]/page.tsx` 이전 버전 복원

---

## Scope

### 신규 생성 파일
```
apps/web/src/
├── app/(more)/agent/register/page.tsx      # 신규 — 등록 페이지
├── domains/agent/hooks/
│   ├── useRegisterAgent.ts                 # 신규 — registerAgent WRITE
│   ├── useAgentActions.ts                  # 신규 — activate/deactivate WRITE
│   └── useSubmitReview.ts                  # 신규 — submitReview WRITE
└── domains/agent/components/
    └── ReviewForm.tsx                      # 신규 — 리뷰 작성 폼
```

### 수정 대상 파일
```
apps/web/src/app/(more)/agent/[id]/page.tsx # 수정 — 토글 + ReviewForm 추가
```

### 참고할 기존 패턴
- `domains/trade/hooks/useSwap.ts`: useWriteContract WRITE 패턴
- `domains/trade/hooks/useAddLiquidity.ts`: tx receipt 처리 패턴

## FP/FN 검증

### 검증 통과: ✅
- 6개 구현 항목 → 5 신규 + 1 수정 파일. 매핑 완전.

---

→ 다음: [Step 05: 볼트 + 권한 관리](step-05-vault-permission.md)
