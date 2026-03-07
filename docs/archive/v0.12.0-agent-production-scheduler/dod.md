# DoD (Definition of Done) - v0.12.0

## 기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | AgentVault V2 컨트랙트에 `getDelegatedUsers(agent)` view 함수가 존재하며, active permission(active=true AND expiry 미도래)인 유저만 반환한다 | (1) forge build 성공 (2) 배포 후 RPC `getDelegatedUsers` 호출 성공 (3) 코드 리뷰: 2-pass 필터 로직이 active+expiry 조건 정확히 체크 |
| F2 | `grantPermission` 호출 시 `_delegatedUsers[agent]` 배열에 유저가 추가되고 `_isDelegated[agent][user]`가 true로 설정된다 (중복 추가 없음) | (1) 코드 리뷰: `_isDelegated` 체크 후 push (2) forge build 성공 |
| F3 | AgentVault V2가 Creditcoin 테스트넷에 배포되고, 새 주소가 다음 3곳에 모두 반영된다: (1) `packages/core/src/config/addresses.ts`의 `ERC8004.agentVault` (2) `packages/core/src/config/addresses.ts`의 `LIQUITY.shared.agentVault` (있는 경우) (3) `packages/agent-runtime/src/config.ts`의 `agentVault` | `grep -rn "새주소" packages/core/src/config/addresses.ts packages/agent-runtime/src/config.ts`로 3곳(또는 LIQUITY.shared 없으면 2곳) 모두 동일 주소 확인 + `readContract(getDelegatedUsers)` RPC 호출 성공 |
| F4 | 스케줄러가 cron tick마다 `getDelegatedUsers(agentEOA)`를 호출하여 온체인 유저 목록을 조회한다. agentEOA는 `privateKeyToAccount(config.agentPrivateKey).address`로 산출한다 | scheduler.service.ts 코드 확인 + 수동 cron trigger 후 로그에 조회된 유저 수 출력 |
| F5 | 스케줄러가 유저 목록을 순회하며 유저별로 `agentService.runAgent(user, manifestId, troveId)`를 호출한다 | 2명 이상 delegation 설정 후 cron trigger → 각 유저별 실행 로그 확인 |
| F6 | `buildTroveMap()`이 cron tick당 1회 실행되어 `TroveManager.getTroveIdsCount()` → `getTroveFromTroveIdsArray(i)` → `TroveNFT.ownerOf(troveId)` 순서로 `Map<user, troveId>`를 구축한다 | (1) 코드 리뷰: buildTroveMap 호출이 for-user 루프 밖에 위치하여 tick당 1회만 호출됨 (2) 배포 후 수동: openTrove된 유저의 troveId가 buildTroveMap 결과에 정확히 매핑됨 |
| F7 | `AGENT_CRON_USER` 환경변수 fallback이 스케줄러에서 완전 제거된다 | grep으로 `AGENT_CRON_USER` 검색 → scheduler.service.ts에서 0건 |
| F8 | `packages/agent-runtime/src/observers/vault.ts`의 expiry 체크가 `permResult.expiry >= now`로 정렬된다 (컨트랙트 `block.timestamp <= perm.expiry`와 동일 semantics) | vault.ts 코드 확인: `>=` 연산자 사용 |
| F9 | `packages/core/src/abis/agent.ts`에 `getDelegatedUsers` ABI가 추가된다 | `cd packages/core && npx tsc --noEmit` 통과 + ABI 배열에 해당 함수 시그니처 존재 |
| F10 | `packages/agent-runtime/src/abis.ts`에 `getDelegatedUsers`, `getTroveIdsCount`, `ownerOf` ABI가 추가된다 | `cd packages/agent-runtime && npx tsc --noEmit` 통과 + ABI 배열에 3개 함수 시그니처 존재 |
| F11 | `packages/agent-runtime/src/config.ts`에 `liquity.troveNFT` 주소가 추가된다 | config.ts 코드 확인 + `AgentConfig.liquity` 타입에 `troveNFT` 필드 존재 |

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | TypeScript strict 모드 에러 0 (변경된 패키지) | `cd apps/agent-server && npx tsc --noEmit` + `cd packages/agent-runtime && npx tsc --noEmit` + `cd packages/core && npx tsc --noEmit` |
| N2 | agent-server 빌드 성공 | `cd apps/agent-server && npm run build` |
| N3 | agent-runtime 패키지 빌드 성공 | `cd packages/agent-runtime && npm run build` |
| N4 | Foundry 컨트랙트 컴파일 성공 | `cd packages/liquity && forge build` |

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | getDelegatedUsers 결과가 빈 배열 (위임 유저 없음) | cron skip + debug 로그 출력. 에러 없이 정상 종료 | 코드 리뷰: `users.length === 0` 분기에서 `Logger.debug` 호출 후 early return 확인 |
| E2 | getDelegatedUsers RPC 호출 실패 | catch → error 로그 → cron skip. 다음 tick에서 재시도 | 코드 리뷰: try-catch 블록 존재 확인 |
| E3 | troveId 스캔 RPC 실패 | troveMap 구축 실패 → 모든 유저에 troveId=0n 할당 (Morpho 경로는 정상, Liquity만 skip) | 코드 리뷰: buildTroveMap 실패 시 빈 Map 반환 + 로그 |
| E4 | 특정 유저 runAgent 실패 | 해당 유저만 error 로그, 다음 유저 계속 진행 | 코드 리뷰: for 루프 내 try-catch 확인 |
| E5 | 동일 유저가 grantPermission 2회 호출 | _delegatedUsers에 중복 추가 없음 (1회만 등장) | 코드 리뷰: `_isDelegated` 체크 → 이미 true면 push 스킵 |
| E6 | revoke 후 re-grant | getDelegatedUsers에 다시 포함됨. _delegatedUsers 배열에는 1개만 존재 (isDelegated로 중복 방지) | 코드 리뷰: revoke는 `active=false`만 설정, `_isDelegated` 유지 → re-grant 시 push 스킵 + active=true → 필터 통과 |
| E7 | expiry가 정확히 현재 timestamp와 동일 | active로 판단 (block.timestamp <= perm.expiry) | 코드 리뷰: getDelegatedUsers의 조건이 `block.timestamp <= perm.expiry` 사용 확인 |
| E8 | activeRuns 동시성 충돌 | ConflictException catch → 해당 유저 skip | 코드 리뷰: 기존 try-catch 패턴에 ConflictException 처리 포함 |
| E9 | trove가 없는 유저 (Morpho만 사용) | troveMap에 해당 유저 없음 → troveId=0n으로 runAgent 호출 → Morpho 정상 실행 | 코드 리뷰: `troveMap.get(user) ?? 0n` 패턴 |

## PRD 목표 ↔ DoD 매핑

| PRD 목표 | DoD 항목 | 커버 |
|----------|---------|------|
| 1. getDelegatedUsers 온체인 조회 | F1, F2, F9 | ✅ |
| 2. 스케줄러 멀티유저 루프 | F4, F5, F7 | ✅ |
| 3. 유저별 troveId 자동 탐색 | F6, F10, F11 | ✅ |
| 4. 컨트랙트 재배포 + 주소 전환 | F3 | ✅ |
| (추가) vault.ts expiry 정렬 | F8 | ✅ |

## 설계 결정 ↔ DoD 매핑

| 설계 결정 | DoD 항목 | 커버 |
|----------|---------|------|
| TD-1: revoke 시 배열 미삭제, view에서 active 필터링 | F1, E6 | ✅ |
| TD-2: cron tick당 1회 global scan → Map | F6 | ✅ |
| TD-3: config에 troveNFT 추가 | F11 | ✅ |
| TD-4: abis.ts에 getTroveIdsCount, ownerOf 추가 | F10 | ✅ |
| TD-5: AGENT_CRON_USER 제거 | F7 | ✅ |
| TD-6: 단일 branch(wCTC) 스캔 | F6 | ✅ |
| TD-7: vault.ts expiry >= now 정렬 | F8 | ✅ |
| TD-8: loadConfig() 직접 호출 + 자체 publicClient | F4 | ✅ |

## Waiver

### Foundry Test → 코드 리뷰 + RPC 검증으로 대체

F1/F2/E5/E6/E7의 검증 방법을 Foundry forge test에서 코드 리뷰 + RPC 검증으로 변경.

**사유**: `packages/liquity`에 `forge-std` 라이브러리가 설치되지 않아 (`lib/forge-std` 미존재) forge test 실행 불가. forge build(컴파일)는 `--skip test`로 성공.

**대체 검증**:
1. `forge build --skip test` — 컴파일 성공 (0 errors)
2. 배포 후 `readContract("getDelegatedUsers", [deployer])` RPC 호출 → 빈 배열 정상 반환
3. 코드 리뷰로 `_isDelegated` 중복 방지, 2-pass 필터, `block.timestamp <= perm.expiry` 조건 확인

**후속 조치**: forge-std 설치 + Foundry 테스트 작성은 별도 task로 분리
