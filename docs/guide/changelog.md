# Changelog

> Snowball Protocol 릴리스 이력

---

### v0.22.0 - Yield Vault FE 개선 (2026-03-07)
- **APY 표시**: Morpho 볼트 supply rate 온체인 계산 (2-phase IRM), StabilityPool은 "Variable"
- **USD 환산**: TVL 옆 (~$X.XX) 표시, Total Deposits StatCard USD 합산
- **입력 검증**: useMemo + try-catch 안전 파싱, Insufficient balance / Exceeds shares 에러
- **withdrawAll**: Max 클릭 시 withdrawAll() 호출, 수동 수정 시 withdraw(shares)
- **스켈레톤 UI**: VaultCard/StatCard 로딩 시 Skeleton 표시, APY 영역 독립 로딩
- **DDD 정리**: morphoMath.ts를 shared/lib/으로 이동 (cross-domain import 해소)

### v0.21.0 - nginx 리버스 프록시 (2026-03-07)
- **nginx 단일 진입점**: 포트 80으로 통일, 경로 기반 라우팅 (`/api/agent/*`, `/api/*`, `/*`)
- **API Key guard 제거**: agent-server에서 ApiKeyGuard 삭제, Next.js API Route 프록시 제거
- **agent-server 정규화**: `setGlobalPrefix("api")` + HealthController 추가
- **Docker Compose 재구성**: nginx → server/agent-server/frontend, 호스트 포트 매핑 제거
- **프론트엔드 정리**: 상대경로 전환, `NEXT_PUBLIC_API_URL` 제거
- 📝 [Phase 문서](../archive/v0.21.0-nginx-reverse-proxy/README.md)

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
