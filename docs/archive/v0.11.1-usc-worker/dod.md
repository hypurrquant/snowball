# DoD (Definition of Done) - v0.11.1

## 기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | `apps/usc-worker` 패키지가 존재하고 `node src/index.mjs`로 실행 가능 | `cd apps/usc-worker && node src/index.mjs` 실행 시 에러 없이 폴링 시작 로그 출력 |
| F2 | Worker가 Sepolia DN Token의 BridgeBurn 이벤트를 감지하여 로그 출력 | Sepolia에서 bridgeBurn 호출 → Worker 로그에 "BridgeBurn detected" + from/amount/txHash 출력 |
| F3 | Worker가 USC ChainInfo에서 attestation 높이를 조회하고 대기 | 로그에 "Waiting for attestation" + 현재/필요 높이 출력 |
| F4 | Worker가 Proof API에서 증명을 획득 | 로그에 "Proof generated" + merkle siblings 수 + continuity roots 수 출력 |
| F5 | Worker가 DNBridgeUSC.processBridgeMint()를 자동 호출하여 mint 완료 | USC 익스플로러에서 BridgeMint 이벤트 확인 + recipient의 balanceOf 증가 |
| F6 | BridgeBurn과 Transfer(to=address(1))의 from/amount/to 교차 검증 수행 | 정상 TX에서 로그에 "Cross-validation passed" 출력 |
| F7 | 이미 처리된 TX는 온체인 processedTxKeys로 revert 시 "Already processed, skipping" 로그 출력 후 성공 처리로 간주 | 이미 처리된 TX가 있는 블록 범위에서 Worker 실행 → "Already processed, skipping" 로그 확인 |
| F8 | START_BLOCK 환경변수로 시작 블록 지정 가능 | START_BLOCK 설정 후 실행 → 해당 블록부터 스캔 시작 확인 |
| F9 | START_BLOCK 미설정 시 DN Token 배포 블록을 기본값으로 사용 | 환경변수 없이 실행 → DN Token 배포 블록부터 스캔 로그 확인 |
| F10 | 블록 내 모든 이벤트 성공 시에만 lastProcessedBlock 전진 | 같은 블록에 2개 이벤트 중 1개 실패 시 → lastProcessedBlock이 전진하지 않고 다음 루프에서 해당 블록 재처리 로그 확인 |

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | .env.example 파일에 필요한 환경변수가 모두 명시됨 | 파일 내용 확인: DEPLOYER_PRIVATE_KEY, SEPOLIA_RPC, USC_RPC, START_BLOCK 등 |
| N2 | package.json에 start 스크립트가 정의됨 | `cat apps/usc-worker/package.json` 에서 `"start"` 키 존재 확인 |
| N3 | 기존 런타임 코드 무수정 | `git status --short -- apps/usc-worker/ docs/phases/v0.11.1-usc-worker/` 에서 모든 변경이 신규 파일(`??`)이며, `packages/usc-bridge/src/` 및 `apps/web/src/` 하위에 usc-worker 관련 변경이 없음 |

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | Sepolia RPC 일시 불응답 | 에러 로그 출력 후 30초 후 다음 루프에서 재시도 | RPC URL을 잘못 설정 후 실행 → 에러 로그 + 재시도 로그 |
| E2 | Proof API 에러 | 3회 재시도 후 실패 시 블록 포인터 안 전진, 다음 루프에서 재시도 | Proof API URL을 잘못 설정 → 재시도 로그 3회 + 블록 포인터 유지 |
| E3 | processBridgeMint revert (already processed) | 성공 처리로 간주 + "Already processed" 로그 | 이미 처리된 TX가 있는 블록 범위에서 Worker 실행 |
| E4 | Worker 재시작 | START_BLOCK부터 재스캔, 이미 처리된 건 자동 스킵 | Worker 중지 후 재시작 → 온체인 처리 완료된 이벤트 스킵 로그 |
| E5 | 폴링 범위에 BridgeBurn 이벤트 없음 | 조용히 다음 루프로 진행 (불필요한 로그 없음) | 이벤트 없는 블록 범위 → 정상 루프 계속 |
| E6 | MAX_RETRY(10) 초과 | 해당 블록 스킵 + 경고 로그 + 복구 안내 출력 | 의도적으로 실패 유발 후 10회 반복 → 스킵 + 경고 로그 확인 |
| E7 | BridgeBurn과 Transfer(to=address(1))의 from/amount 불일치 | 해당 이벤트 스킵 + 경고 로그 "Cross-validation failed" | 정상 환경에서는 발생하지 않으나, 로직이 코드에 존재하는지 코드 리뷰로 확인 |
