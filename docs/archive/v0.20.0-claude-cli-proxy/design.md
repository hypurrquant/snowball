# Design — v0.20.0 Claude CLI Proxy

## 아키텍처

```
[Agent Server (Docker)]
  → anthropic-planner.ts
    → HTTP POST http://host.docker.internal:3002/plan
      → [Claude Proxy Server (호스트 네이티브, port 3002)]
        → claude -p "프롬프트"
        → stdout 캡처
        → JSON 파싱 → 응답 반환
```

## 컴포넌트

### 1. Claude Proxy Server (`apps/claude-proxy/`)

초경량 HTTP 서버. POST `/plan` 하나만 처리.

```
요청: POST /plan
Body: { prompt: string }

처리:
1. claude -p "{prompt}" 실행 (child_process.execSync or spawn)
2. stdout에서 JSON 블록 추출
3. 응답: { actions: [...], reasoning: string }

에러: claude CLI 실패 시 → 500 + 에러 메시지
```

**기술 선택:**
- Node.js `http` 모듈 (의존성 0)
- `child_process.execSync` (동기 실행, 단순)
- 포트: 3002

### 2. Planner 수정 (`packages/agent-runtime/src/planner/`)

**새 파일**: `cli-planner.ts`
- `anthropic-planner.ts`와 동일한 시그니처: `plan(snapshot, manifest, registry, config)`
- Anthropic SDK 대신 HTTP POST를 claude-proxy에 보냄
- tool_use 파싱 대신 JSON 텍스트 파싱

**프롬프트 구조:**
```
## 역할
DeFi 포트폴리오 관리 에이전트

## 현재 상태
{buildStateMessage(snapshot)}

## 실행 가능한 행동
{capabilities를 텍스트로 나열}

## 응답 규칙
반드시 아래 JSON만 출력하세요. 마크다운 코드블록이나 설명 없이.
행동이 불필요하면 actions를 빈 배열로.

{"actions":[{"capability":"morpho.supply","input":{"amount":"..."},"reason":"..."}],"reasoning":"..."}
```

**JSON 추출 로직:**
1. 응답에서 `{` ~ `}` 최외곽 JSON 블록 추출
2. `JSON.parse()` 시도
3. 실패 시 → actions: [], reasoning: "parse error" 반환 (안전한 fallback)

### 3. Planner 전환 (`runtime.ts`)

환경변수 `PLANNER_MODE`로 전환:
- `PLANNER_MODE=cli` → cli-planner 사용 (기본값)
- `PLANNER_MODE=api` → anthropic-planner 사용 (fallback)

### 4. 환경변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PLANNER_MODE` | `cli` | `cli` or `api` |
| `CLAUDE_PROXY_URL` | `http://host.docker.internal:3002` | 프록시 서버 주소 |
| `ANTHROPIC_API_KEY` | (기존) | api 모드 시 필요 |

### 5. 네트워크 고려사항

```
Docker 내부 (agent-server) → 호스트 머신 (claude-proxy)
  URL: http://host.docker.internal:3002/plan

로컬 개발 (Docker 없이) → 같은 머신
  URL: http://localhost:3002/plan
```

`CLAUDE_PROXY_URL` 환경변수로 두 환경 모두 지원.
