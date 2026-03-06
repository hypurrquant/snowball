# USC Bridge Worker - v0.11.1

## 문제 정의

### 현상
- 현재 USC Bridge PoC(`packages/usc-bridge/`)는 DN 토큰 burn → attestation 대기 → proof 생성 → USC mint 전체 플로우를 **수동 1회성 스크립트(`bridge-e2e.mjs`)**로만 실행 가능하다
- Sepolia에서 BridgeBurn 이벤트가 발생해도 누군가 수동으로 스크립트를 돌려야 USC 쪽에서 mint가 된다
- 상시 이벤트 모니터링/자동 처리가 불가능하다

### 원인
- 기존 PoC는 "USC 증명 파이프라인이 동작하는가"를 1회 검증하기 위해 만들어졌다
- USC 문서가 제안하는 "오프체인 오라클 워커" 패턴이 서버로 구현되지 않았다
- bridge-e2e.mjs는 CLI 인자로 burn tx hash를 받는 구조로, 이벤트 리스닝 기능이 없다

### 영향
- Bridge가 자동화되지 않아 실용적 토큰 브릿지로 쓸 수 없다
- 사용자가 Sepolia에서 DN을 burn해도, 별도 조치 없이는 USC에서 mint되지 않는다
- USC의 핵심 패턴인 "자동 크로스체인 실행"이 미구현 상태

### 목표
1. Sepolia에서 DN Token `BridgeBurn` 이벤트를 실시간 감지하는 오프체인 워커 서버 구현
2. 감지된 burn 이벤트에 대해 자동으로 attestation 대기 → proof 생성 → `DNBridgeUSC.processBridgeMint()` 호출
3. `apps/usc-worker`에 독립 Node.js 서버로 구현
4. 온체인 `processedTxKeys`를 통한 중복 제출 방지 + 메모리 기반 마지막 블록 추적

### 비목표 (Out of Scope)
- 신규 USC 컨트랙트 작성/배포 (기존 DNBridgeUSC 그대로 사용)
- Sepolia 외 다른 소스 체인 지원
- 프론트엔드 UI 구현 (apps/web 변경 없음)
- 기존 bridge-e2e.mjs 수정 (그대로 유지)
- 파일/DB 기반 영속성 (재시작 시 처음부터 스캔, 온체인 중복 방지로 안전)
- 프로덕션 인프라 (PM2, Docker, 모니터링 대시보드 등)
- Options 모듈 관련 작업

## 제약사항

### 프로토콜 제약
- USC Attestor는 Sepolia(chainKey=1)만 지원
- Attestation 지연: 소스 블록 확정 후 약 4분 (targetHeight = txBlockNumber + 1)
- Proof API 배치 미지원: 트랜잭션 1건씩 증명 요청
- `DNBridgeUSC.processBridgeMint()`은 operator 권한 필요

### 인프라 레퍼런스
| 항목 | 값 |
|------|-----|
| Sepolia RPC | `https://1rpc.io/sepolia` |
| USC Testnet RPC | `https://rpc.usc-testnet2.creditcoin.network` (chainId: 102036) |
| Proof API | `https://proof-gen-api.usc-testnet2.creditcoin.network` |
| ChainInfo Precompile | `0x0000000000000000000000000000000000000fd3` |
| Native Query Verifier | `0x0000000000000000000000000000000000000FD2` |
| DN Token (Sepolia) | `0xE964cb9cc1C8DA4847C24E3960aDa2F8Ff12C380` |
| DNBridgeUSC (USC) | `0x23E741a87ad9567Dff27eb34FaABa1444154D458` |
