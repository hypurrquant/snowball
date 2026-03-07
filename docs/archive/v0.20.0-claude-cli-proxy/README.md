# Claude CLI Proxy — v0.20.0

## 문제 정의

### 현상
- Agent Runtime의 Planner가 Anthropic SDK를 통해 Claude API를 직접 호출한다
- Claude API 사용을 위해 별도의 `ANTHROPIC_API_KEY`와 API 과금이 필요하다

### 원인
- `anthropic-planner.ts`가 `new Anthropic({ apiKey })` + `client.messages.create()` + `tool_use` 모드로 동작하도록 설계되어 있다
- Claude Code CLI(`claude` 명령)가 로컬 머신에 이미 설치·인증되어 있지만, 런타임에서 활용하지 않고 있다

### 영향
- API Key 관리 부담 + 별도 과금
- Claude Code 구독을 이미 보유하고 있음에도 이중 비용 발생

### 목표
1. 로컬 머신의 Claude CLI를 활용하는 경량 HTTP 프록시 서버(`apps/claude-proxy`)를 만든다
2. Agent Runtime의 Planner가 Anthropic SDK 대신 이 프록시에 요청을 보내도록 수정한다
3. Claude CLI의 텍스트 응답에서 구조화된 JSON을 추출하여 기존 파이프라인(Capability → Execute)과 호환시킨다

### 비목표 (Out of Scope)
- Docker화 (로컬 네이티브 CLI 사용이 전제이므로 컨테이너화하지 않음)
- Anthropic SDK 코드 삭제 (fallback으로 유지 가능)
- Claude CLI 외 다른 LLM CLI 지원
- 프론트엔드 변경

## 제약사항
- Claude CLI는 `tool_use`(함수 호출)를 지원하지 않음 → 프롬프트 엔지니어링으로 JSON 응답을 유도해야 함
- 프록시 서버 포트: 3002
- 로컬 네이티브 실행 전용 (Docker 제외)
- Claude CLI의 `-p`(print) 모드 사용 → 비대화형 단발 호출
