# Step 02: 환경변수 템플릿 + Quick Start

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: 가능 (git revert)
- **선행 조건**: Step 01 (SoT 확정 후 RPC_URL 등 값 확인)

---

## 1. 구현 내용 (design.md 기반)

- `apps/agent-server/.env.example` 신규 생성: AGENT_PRIVATE_KEY, ANTHROPIC_API_KEY, API_KEY, RPC_URL + 설명 주석
- 루트 `.env.example`에 Agent Server 섹션 추가
- `apps/agent-server/README.md` Quick Start 섹션 추가 (구동 절차)

## 2. 완료 조건
- [ ] (F19) `apps/agent-server/.env.example`에 AGENT_PRIVATE_KEY, ANTHROPIC_API_KEY, API_KEY, RPC_URL 4개 변수가 설명과 함께 존재
- [ ] (F20) 루트 `.env.example`에 Agent Server 섹션이 추가되어 4개 변수 기재
- [ ] (F21) `apps/agent-server/README.md`에 Quick Start 섹션 존재 + .env 복사 → 변수 설정 → pnpm install → pnpm start → GET /agent/status 200 재현 가능

## 3. 롤백 방법
- `git revert` 로 파일 원복/삭제
- 영향 범위: 문서/설정 파일만. 코드 로직 변경 없음

---

## Scope

### 수정 대상 파일
```
.env.example                               # 수정 - Agent Server 섹션 추가
apps/agent-server/README.md                 # 수정 - Quick Start 섹션 추가 (또는 신규)
```

### 신규 생성 파일
```
apps/agent-server/.env.example              # 신규 - Agent 전용 환경변수 템플릿
```

### 참고할 기존 패턴
- `apps/usc-worker/.env.example`: 앱별 .env.example 패턴
- 루트 `.env.example`: 기존 섹션 구조

### Side Effect 위험
- 없음. 문서/설정 파일만 변경

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| .env.example (루트) | F20 | OK |
| .env.example (앱) | F19 | OK |
| README.md | F21 Quick Start | OK |

### False Negative (누락)
없음

### 검증 통과: 확인

---

> 다음: [Step 03: SQLite 영속화](step-03-sqlite.md)
