# Step 03: 프론트엔드 정리

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: ✅ (git revert)
- **선행 조건**: Step 02 (nginx 라우팅 동작)

---

## 1. 구현 내용 (design.md 기반)
- Next.js API Route 프록시 2개 삭제 (`app/api/agent/run/route.ts`, `app/api/agent/runs/route.ts`)
- `usePoolList.ts`, `useProtocolStats.ts`에서 `NEXT_PUBLIC_API_URL` 참조를 상대경로로 변경
- `useRunAgent.ts`, `useAgentRuns.ts`는 변경 불필요 (이미 `/api/agent/*` 상대경로)
- 환경변수 정리: `.env.local`, `.env.example` 등에서 `NEXT_PUBLIC_API_URL`, `AGENT_SERVER_URL` 제거

## 2. 완료 조건
- [ ] `apps/web/src/app/api/agent/` 디렉토리가 존재하지 않음
- [ ] `grep -r 'NEXT_PUBLIC_API_URL' apps/web/src/` → 결과 없음
- [ ] `grep -r 'AGENT_SERVER_URL' apps/web/src/` → 결과 없음
- [ ] `cd apps/web && npx tsc --noEmit` 에러 0
- [ ] `cd apps/web && pnpm build` 성공
- [ ] 브라우저에서 Pool 페이지 → 풀 목록 정상 로드
- [ ] 브라우저에서 Agent 실행 → 정상 동작

## 3. 롤백 방법
- `git revert` 1커밋
- 영향 범위: 프론트엔드만

---

## Scope

### 삭제 파일
```
apps/web/src/app/api/agent/
├── run/route.ts                     # 삭제 - API Key 프록시
└── runs/route.ts                    # 삭제 - API Key 프록시
```

### 수정 대상 파일
```
apps/web/src/
├── domains/trade/hooks/usePoolList.ts       # 수정 - NEXT_PUBLIC_API_URL → 상대경로
├── domains/trade/hooks/useProtocolStats.ts  # 수정 - NEXT_PUBLIC_API_URL → 상대경로
└── .env.local                               # 수정 - NEXT_PUBLIC_API_URL, AGENT_SERVER_URL 제거
```

## FP/FN 검증

### 검증 체크리스트
- [x] Scope의 모든 파일이 구현 내용과 연결됨
- [x] 구현 내용의 모든 항목이 Scope에 반영됨
- [x] 검증 통과: ✅

---

→ 완료
