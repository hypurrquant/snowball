# Agent Production Hardening - v0.18.0

## 문제 정의

### 현상

Agent 시스템(AgentVault + Agent Runtime + Agent Server + Frontend)의 **핵심 비즈니스 로직은 완성**되어 있으나, 테스트 서버를 외부에 열어 실제 유저 자금을 다룰 수 있는 **운영 수준(production-grade)에 도달하지 못한 상태**이다.

구체적 증상:
1. **실행 이력 휘발**: Agent Server의 실행 기록이 메모리 배열(`RunResult[]`)에만 저장. 서버 재시작 시 전체 소멸
2. **로그 추적 불가**: `console.log/warn`만 사용. 파일 로깅 없어 장애 발생 시 원인 분석 불가
3. **API 남용 방어 없음**: API Key 인증만 존재. Rate limiting 없어 무한 호출 시 Claude API 비용 폭탄
4. **Agent 실행 무한 대기**: Claude API 응답 timeout 미설정. 응답 지연 시 서버 hung
5. **E2E 검증 부재**: 통합 테스트 없음. 파이프라인(Observe→Plan→Execute) 회귀 방지 불가
6. **환경 설정 가이드 없음**: `.env.example` 없음. 신규 개발자가 필수 환경변수를 알 방법이 없음
7. **AgentVault V3 배포 미확인**: 코드는 V3 ABI를 사용하지만, 테스트넷에 V3가 실제 배포됐는지 검증 불가. 배포 기록(tx hash) 없음

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
| 서버 안정성 | High | Timeout 없음 → 하나의 요청이 서버 전체를 block |
| 품질 보증 불가 | Medium | 테스트 없음 → 코드 변경 시 regression 검출 불가 |
| 온보딩 장벽 | Medium | 환경 설정 가이드 없음 → 새 개발자 셋업 시간 낭비 |
| 컨트랙트 신뢰성 | High | V3 배포 미확인 → 프론트엔드/런타임이 존재하지 않는 컨트랙트를 호출할 수 있음 |

### 목표

이 Phase가 완료되면:

1. **실행 이력 영속화**: 서버 재시작 후에도 모든 Agent 실행 기록이 보존된다
2. **구조화된 로깅**: 파일 기반 로그가 남아 장애 원인을 사후 추적할 수 있다
3. **API 보호**: Rate limiting으로 Claude API 비용 폭탄을 방지한다
4. **실행 안정성**: Agent 실행에 timeout이 적용되어 서버 hung이 발생하지 않는다
5. **회귀 방지**: E2E 테스트로 핵심 파이프라인의 정상 동작을 검증할 수 있다
6. **개발자 온보딩**: `.env.example` + 배포 가이드로 새 개발자가 10분 내에 환경 구성 가능하다
7. **컨트랙트 배포 확정**: AgentVault V3가 테스트넷에 배포되고, 주소가 코드 전체에 동기화된다

### 비목표 (Out of Scope)

- **DB 마이그레이션 프레임워크**: 이번에는 단순 파일 기반 또는 SQLite 수준. 본격적인 PostgreSQL + migration은 다음 Phase
- **모니터링 대시보드**: Prometheus/Grafana 구축은 범위 밖. 로그 파일 생성까지만
- **Cron 병렬화 / 큐 시스템**: BullMQ 등 메시지 큐 도입은 다음 Phase. 현재 순차 처리 유지
- **Private Key KMS 통합**: AWS KMS / HashiCorp Vault 연동은 범위 밖. 환경변수 주입 유지
- **프론트엔드 변경**: 이번 Phase는 백엔드/인프라에 집중. UI 변경 없음
- **새로운 Capability 추가**: 기존 4개 Capability 유지. 신규 기능 개발 없음

## 제약사항

- **기술 스택 유지**: NestJS + viem + Anthropic SDK. 프레임워크 교체 없음
- **모노레포 구조 유지**: `apps/agent-server/`, `packages/agent-runtime/` 위치 유지
- **Creditcoin Testnet**: chainId 102031 대상. 메인넷 배포 아님
- **최소 침습**: Agent Runtime 핵심 파이프라인(Observe→Plan→Execute) 로직은 변경하지 않음. 인프라 래핑만 추가
