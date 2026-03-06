# Step 03: 마켓플레이스 UI (READ 중심)

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅ (파일 삭제/복원)
- **선행 조건**: Step 02 (READ 훅)

---

## 1. 구현 내용 (design.md 기반)
- `/agent` 페이지 교체 — 전체 에이전트 탐색 + 내 에이전트 섹션 (useAgentList, useMyAgents)
- `AgentCard.tsx` — 에이전트 카드 (이름, 타입, 상태, 인증 배지, 링크)
- `/agent/[id]` 프로필 페이지 신규 — useAgentProfile 기반
- `AgentProfileHeader.tsx` — 프로필 상단 (이름, 타입, endpoint, 소유자, 활성화, 인증 배지)
- `ReputationSection.tsx` — 평판 점수 (별점 + 수치) + 성공률 + 리뷰 목록

## 2. 완료 조건
- [ ] `/agent` 페이지에서 에이전트 카드 그리드가 표시됨 (DoD F4)
- [ ] `/agent` 페이지에서 지갑 연결 시 "My Agents" 섹션 표시 (DoD F5)
- [ ] `/agent` 페이지가 지갑 미연결에서도 탐색 가능 (DoD N5)
- [ ] `/agent/[id]` 프로필 페이지에서 에이전트 상세 표시 (DoD F6)
- [ ] 평판 점수 + 리뷰 목록 표시 (DoD F7, F8)
- [ ] 인증 배지 표시 (DoD F9)
- [ ] 에이전트 0개일 때 empty state 표시 (DoD E1)
- [ ] 존재하지 않는 ID 접근 시 not found 표시 (DoD E2)
- [ ] 모든 컴포넌트에서 로딩 Skeleton 표시 (DoD N6)
- [ ] `pnpm --filter @snowball/web exec tsc --noEmit` 에러 없음

## 3. 롤백 방법
- 기존 `/agent/page.tsx` git 복원 + 신규 파일 삭제

---

## Scope

### 수정 대상 파일
```
apps/web/src/app/(more)/agent/page.tsx  # 교체 — 플레이스홀더 → 마켓플레이스
```

### 신규 생성 파일
```
apps/web/src/
├── app/(more)/agent/[id]/page.tsx          # 신규 — 프로필 페이지
└── domains/agent/components/
    ├── AgentCard.tsx                        # 신규 — 에이전트 카드
    ├── AgentProfileHeader.tsx               # 신규 — 프로필 상단
    └── ReputationSection.tsx                # 신규 — 평판 + 리뷰
```

### Side Effect 위험
- 기존 `/agent` 페이지 완전 교체 → 현재 플레이스홀더 UI 소실 (의도된 동작)

### 참고할 기존 패턴
- `app/(trade)/pool/page.tsx`: 풀 목록 카드 그리드
- `app/(trade)/pool/[pair]/page.tsx`: 상세 페이지 + Back 네비게이션

## FP/FN 검증

### 검증 통과: ✅
- 5개 파일 (1 수정 + 4 신규) = 구현 5항목과 1:1 매핑

---

→ 다음: [Step 04: WRITE 훅 + 등록/리뷰/활성화](step-04-write-hooks.md)
