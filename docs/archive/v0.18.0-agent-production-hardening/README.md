# Agent Production Hardening - v0.18.0

## 문제 정의

### 현상

Agent 시스템(AgentVault + Agent Runtime + Agent Server + Frontend)의 **핵심 비즈니스 로직은 완성**되어 있으나, 테스트 서버를 외부에 열어 실제 유저 자금을 다룰 수 있는 **운영 수준(production-grade)에 도달하지 못한 상태**이다.

구체적 증상:
1. **실행 이력 휘발**: Agent Server의 실행 기록이 메모리 배열(`RunResult[]`)에만 저장. 서버 재시작 시 전체 소멸
2. **로그 추적 불가**: `console.log/warn`만 사용. 파일 로깅 없어 장애 발생 시 원인 분석 불가
3. **API 남용 방어 없음**: API Key 인증만 존재. Rate limiting 없어 무한 호출 시 Claude API 비용 폭탄
4. **Agent 실행 timeout 부재**: Claude API 응답 timeout 미설정(`anthropic-planner.ts:49`). 응답 지연 시 해당 요청이 장기 점유되고, Cron 순차 루프(`scheduler.service.ts`)에서 후속 유저 실행이 무기한 지연
5. **E2E 검증 부재**: 통합 테스트 없음. 파이프라인(Observe→Plan→Execute) 회귀 방지 불가
6. **Agent 환경변수 템플릿 불충분**: 루트 `.env.example`은 존재하지만 Agent 운영에 필수인 `AGENT_PRIVATE_KEY`, `ANTHROPIC_API_KEY`, `API_KEY`(`config.ts`에서 `requireEnv()`로 강제) 및 운영 환경에서 사실상 필요한 `RPC_URL`(기본값 fallback 있으나 production에서는 지정 필요)이 누락. 신규 개발자가 Agent Server를 구동하려면 소스코드를 뒤져야 함
7. **AgentVault 주소 Source-of-Truth 드리프트**: 런타임/코어 설정(`config.ts`, `addresses.ts`)은 `0x7d3f...`를 사용하지만, 배포 기록(`packages/liquity/deployments/addresses-102031.json`)은 `0xb944...`를 가리킴. 두 주소의 버전 관계나 배포 provenance(tx hash, 배포 시점)가 저장소 내에 기록되어 있지 않아, 어느 것이 정당한 canonical 주소인지 독립 검증할 수 없음

### 원인

- v0.11.0~v0.14.0에서 **기능 구현에 집중**하며 운영 인프라를 후순위로 미룸
- 단일 개발자 환경에서 로컬 테스트만 수행하여 운영 이슈가 표면화되지 않음
- 초기 프로토타입 아키텍처(메모리 저장, console 로깅)가 그대로 유지됨

### 영향

| 영향 | 심각도 | 설명 |
|------|--------|------|
| 감사 불가 | Critical | 실행 이력 소멸 → 에이전트가 유저 자금으로 뭘 했는지 증명 불가 |
| 장애 대응 불가 | Critical | 로그 없음 → 서버 죽은 원인 파악 불가 |
| 비용 리스크 | High | Rate limit 없음 → Claude API 무제한 호출 가능 |
| 서버 안정성 | High | Timeout 없음 → 요청 장기 점유 + Cron 순차 루프 지연으로 후속 유저 실행 밀림 |
| 품질 보증 불가 | Medium | 테스트 없음 → 코드 변경 시 regression 검출 불가 |
| 온보딩 장벽 | Medium | Agent 환경변수 템플릿 불충분 → 새 개발자가 소스코드를 뒤져야 함 |
| 컨트랙트 신뢰성 | High | 주소 SoT 드리프트 → 배포 기록(`0xb944...`)과 코드 설정(`0x7d3f...`) 불일치, provenance 부재로 독립 검증 불가 |

### 목표

이 Phase가 완료되면:

1. **실행 이력 영속화**: 서버 재시작 후에도 모든 Agent 실행 기록이 보존된다
2. **구조화된 로깅**: 파일 기반 로그가 남아 장애 원인을 사후 추적할 수 있다
3. **API 보호**: Rate limiting으로 Claude API 비용 폭탄을 방지한다
4. **실행 안정성**: Agent 실행에 timeout이 적용되어 요청 장기 점유 및 Cron 지연이 발생하지 않는다
5. **회귀 방지**: E2E 테스트로 핵심 파이프라인의 정상 동작을 검증할 수 있다
6. **개발자 온보딩**: 루트 `.env.example`에 Agent 필수 변수 추가 + 배포 가이드로 새 개발자가 10분 내에 Agent Server 구동 가능하다
7. **컨트랙트 주소 SoT 확립**: AgentVault 배포를 검증(또는 재배포)하고, 배포 기록(`addresses-102031.json`)과 코드 설정(`config.ts`, `addresses.ts`)을 단일 소스로 동기화하며, 배포 provenance(tx hash, 배포 시점)를 기록한다

### 비목표 (Out of Scope)

- **DB 마이그레이션 프레임워크**: 이번에는 단순 파일 기반 또는 SQLite 수준. 본격적인 PostgreSQL + migration은 다음 Phase
- **모니터링 대시보드**: Prometheus/Grafana 구축은 범위 밖. 로그 파일 생성까지만
- **Cron 병렬화 / 큐 시스템**: BullMQ 등 메시지 큐 도입은 다음 Phase. 현재 순차 처리 유지
- **Private Key KMS 통합**: AWS KMS / HashiCorp Vault 연동은 범위 밖. 환경변수 주입 유지
- **프론트엔드 UI 변경**: 이번 Phase는 백엔드/인프라에 집중. 컴포넌트/페이지 UI 변경 없음. 단, `packages/core/src/config/addresses.ts`의 주소 동기화는 목표 7에 포함 (FE가 re-export하는 설정 파일이므로)
- **새로운 Capability 추가**: 기존 4개 Capability 유지. 신규 기능 개발 없음

## 제약사항

- **기술 스택 유지**: NestJS + viem + Anthropic SDK. 프레임워크 교체 없음
- **모노레포 구조 유지**: `apps/agent-server/`, `packages/agent-runtime/` 위치 유지
- **Creditcoin Testnet**: chainId 102031 대상. 메인넷 배포 아님
- **최소 침습**: Agent Runtime 핵심 파이프라인(Observe→Plan→Execute) 로직은 변경하지 않음. 인프라 래핑만 추가
