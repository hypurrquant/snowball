# Changelog

> Snowball Protocol 릴리스 이력

---

### v0.20.0 - Claude CLI Proxy (2026-03-07)
- **Claude Proxy 서버**: `apps/claude-proxy/` — Claude CLI를 HTTP로 래핑하는 경량 프록시 (포트 3002)
- **CLI Planner**: Anthropic SDK 대신 로컬 Claude CLI를 통해 전략 수립
- **모드 전환**: `PLANNER_MODE=cli|api` 환경변수로 CLI/API 전환

### v0.18.0 - Agent Server 운영 강화 (2026-03-07)
- **SQLite 영속화**: 2-phase write + WAL 모드 + crash recovery
- **Winston 로깅**: 콘솔 + 파일 + 에러 파일 3중 로깅
- **Rate Limiting**: POST /agent/run 10회/분 제한 (NestJS Throttler)
- **SDK Timeout**: Anthropic SDK 60초 타임아웃
- **DI 리팩토링**: AgentRuntime을 NestJS provider로 주입 (테스트 mock 가능)
- **SoT 통합**: AgentVault 주소 3개 drift → canonical 0x7d3f 통일
- **E2E 테스트**: 11 시나리오 (정상실행, 401, 409, 필터, 404, 상태, 영속성, crash recovery, BigInt, status mapping)

### v0.17.0 - DN Bridge 프론트엔드 + 멀티체인 (2026-03-07)
- DN Bridge 크로스체인 UI + BridgeVault/DN Token/DNBridgeUSC 컨트랙트

### v0.10.0 - Agent ERC-8004 마켓플레이스 (2026-03-07)
- Agent 마켓플레이스 + 볼트 위임 UI

### v0.8.0 - Pool New Position (2026-03-07)
- Uniswap V3 풀 새 포지션 생성 UI

### v0.7.0 - Swap 가격 차트 (2026-03-07)
- Recharts AreaChart + 2컬럼 레이아웃

### v0.6.0 - Pool Dashboard (2026-03-07)
- 풀 목록 + 상세 페이지

### v0.4.0 - DEX Uniswap V3 마이그레이션 (2026-03-07)
- Algebra V4 → Uniswap V3 전환

### v0.3.0 - ABI 전수 검증 (2026-03-07)
- 온체인 ABI 전수 교정

### v0.2.1 - DDD 리팩토링 (2026-03-07)
- 4계층 DDD 아키텍처 적용
