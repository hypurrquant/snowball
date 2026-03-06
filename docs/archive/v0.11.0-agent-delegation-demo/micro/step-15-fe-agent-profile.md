# Step 15: FE 에이전트 프로필 업데이트 + UX 흐름

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅ (git checkout)
- **선행 조건**: Step 12 (agent 훅), Step 13 (BFF), Step 14 (delegation 페이지)
- **DoD 매핑**: F33, F34, F35, F39

---

## 1. 구현 내용 (design.md 기반)

- `/agent/[id]` 페이지 수정:
  - 기존 `PermissionForm` 제거 → "Delegate" 버튼으로 교체 (`/agent/delegate/[id]`로 이동) (F33)
  - `RunAgentButton.tsx` 추가 — "Run Agent" 버튼, 클릭 시 BFF 경유 실행 (F34)
  - `ActivityLog.tsx` 추가 — 서버 이력 + 온체인 이벤트 병합 표시 (F35)
- 마켓플레이스 → 프로필 → 위임 UX 흐름 확인:
  - `/agent` → 카드 클릭 → `/agent/[id]` → "Delegate" → `/agent/delegate/[id]` (F39)

## 2. 완료 조건

- [ ] `/agent/[id]` 페이지에서 기존 PermissionForm 제거, "Delegate" 버튼이 `/agent/delegate/[id]`로 이동 (F33)
- [ ] `RunAgentButton` 표시, 클릭 시 BFF 경유 실행 결과 표시 (F34)
- [ ] `ActivityLog` 표시 — 서버 이력 + 온체인 이벤트 병합 (F35)
- [ ] `/agent` → 카드 → `/agent/[id]` → "Delegate" → `/agent/delegate/[id]` 흐름 끊김 없이 동작 (F39)
- [ ] `tsc --noEmit` 통과
- [ ] `npm run build` 통과 (N4)

## 3. 롤백 방법
- `git checkout` 으로 `/agent/[id]` 페이지 원복 + 신규 컴포넌트 삭제

---

## Scope

### 신규 생성 파일
```
apps/web/src/domains/agent/components/
├── RunAgentButton.tsx       # 신규 — Run Agent 버튼
└── ActivityLog.tsx           # 신규 — 실행 이력 + 온체인 이벤트 병합
```

### 수정 대상 파일
```
apps/web/src/app/(more)/agent/[id]/page.tsx
  # 수정 — PermissionForm 제거, Delegate 버튼 + RunAgentButton + ActivityLog 추가
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| useRunAgent | 직접 import | RunAgentButton에서 사용 |
| useAgentRuns | 직접 import | ActivityLog 서버 이력 |
| useActivityLog | 직접 import | ActivityLog 온체인 이벤트 |
| PermissionForm | 제거 대상 | import 삭제 |

### 참고할 기존 패턴
- `apps/web/src/app/(more)/agent/[id]/page.tsx` — 기존 레이아웃 유지하면서 수정

### Side Effect 위험
- PermissionForm 제거 시 기존 사용자가 직접 permission 관리 불가 → DelegationSetupPage로 대체됨

## FP/FN 검증

### 검증 체크리스트
- [x] page.tsx 수정 — F33 (PermissionForm 제거 + Delegate 버튼)
- [x] RunAgentButton — F34
- [x] ActivityLog — F35
- [x] UX 흐름 — F39

### False Negative 확인
- N3 (tsc) + N4 (빌드) → 이 Step에서 최종 확인

### 검증 통과: ✅

---

> 이전: [Step 14: FE 위임 셋업 페이지](step-14-fe-delegation-page.md)
