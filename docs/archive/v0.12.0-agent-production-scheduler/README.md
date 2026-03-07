# Agent Production Scheduler - v0.12.0

## 문제 정의

### 현상
v0.11.0에서 Agent Delegation Demo를 구현했으나, 스케줄러가 **환경변수에 하드코딩된 단일 유저**만 처리한다.

```typescript
// 현재 scheduler.service.ts
const cronUser = process.env.AGENT_CRON_USER;  // 1명만 가능
```

- 복수 유저를 자동으로 처리하는 메커니즘이 없음
- AgentVault 컨트랙트에 "위임한 유저 목록"을 조회하는 함수가 없음 (`mapping(address => mapping(address => Permission))` — 개별 조회만 가능)
- 유저별 troveId 매핑이 없어 Liquity 경로가 사실상 동작 불가

### 원인
1. **컨트랙트**: `_permissions` mapping은 `(user, agent)` 쌍으로만 접근 가능. 전체 유저 리스트를 저장하거나 반환하는 로직 없음
2. **스케줄러**: 데모용으로 env 기반 단일 유저 실행만 구현
3. **troveId**: UI에서 수동 입력만 가능. 서버 사이드에서 유저별 troveId를 알 수 없음

### 영향
- **스케일 불가**: 10명, 100명의 유저가 delegation을 설정해도 실제로 봇이 자동 실행할 수 없음
- **Liquity 경로 미동작**: cron에서 troveId 0n으로 실행 → 항상 실패
- **프로덕션 배포 불가**: 현재 상태로는 데모 이상의 운영이 불가

### 목표
1. **AgentVault 컨트랙트 업그레이드**: `getDelegatedUsers(agent)` 온체인 조회 함수 추가 — 특정 에이전트에게 active 권한을 부여한 유저 목록을 한 번에 조회. "active"의 정의: `permission.active == true && (permission.expiry == 0 || block.timestamp <= permission.expiry)` (기존 `executeOnBehalf`의 expiry 체크 `block.timestamp <= perm.expiry`와 동일한 semantics)
2. **스케줄러 멀티유저 루프**: 온체인 유저 목록 조회 → 유저별 순차 실행 (`runAgent` per user). 조회 대상 agent address는 `config.ts`의 `agentVault` 주소가 아닌, **에이전트 EOA** (런타임이 tx를 보내는 주체)로 조회
3. **유저별 troveId 자동 탐색**: TroveNFT(ERC721)의 `ownerOf(troveId)`를 활용. 구체적 흐름: `TroveManager.getTroveIdsCount()` → `getTroveFromTroveIdsArray(index)` → `TroveNFT.ownerOf(troveId)` → user와 매칭. `TroveOperation` 이벤트는 `_troveId`만 indexed이고 owner 주소를 포함하지 않으므로, 이벤트 단독으로는 user→troveId 매핑 불가. 따라서 TroveNFT ERC721 `ownerOf()` 온체인 조회가 source of truth
4. **컨트랙트 재배포 + 주소 전환**: `scripts/simulation-accounts.json`의 deployer 계정으로 업그레이드된 AgentVault 배포. 배포 후 다음 주소를 모두 업데이트:
   - `packages/core/src/config/addresses.ts` → `ERC8004.agentVault`
   - `packages/agent-runtime/src/config.ts` → `agentVault`

### 비목표 (Out of Scope)
- **병렬/큐 처리**: Bull 큐, worker thread 등은 이번 스코프 밖. 순차 loop로 충분
- **이벤트 인덱서/DB**: 별도 DB나 인덱싱 서비스 도입하지 않음
- **프론트엔드 변경**: v0.11.0 UI는 그대로 유지 (ABI 업데이트만 반영)
- **기존 Capability 변경**: morpho.supply, liquity.adjustInterestRate 등 기존 로직은 변경하지 않음
- **가스비 최적화**: Multicall 배칭 등은 이번에 하지 않음
- **Pagination**: 유저 수가 테스트넷 규모이므로 pagination 불필요. agent당 delegated user 수 상한 가정: **100명 이하**. 유저 배열이 gas limit을 초과하는 시나리오는 고려하지 않음

## 의사결정: 온체인 조회 vs 이벤트 인덱싱

`getDelegatedUsers(agent)` 온체인 직접 조회를 선택한 이유:

1. **현재 상태 반영**: revoke/expiry를 즉시 반영한 "현재 active 유저"를 읽어야 함. 이벤트 replay는 grant → revoke → re-grant 히스토리를 재구성해야 하므로 복잡
2. **운영 컴포넌트 최소화**: 별도 인덱서 서비스나 DB를 운영하지 않음. 스케줄러가 온체인을 직접 읽으면 추가 인프라 불필요
3. **테스트넷 규모**: 유저 수가 100명 이하이므로 gas/calldata 비용 무시 가능

## 제약사항
- AgentVault 컨트랙트 재배포 필요 — 기존 deposit/permission 상태는 리셋됨 (테스트넷이므로 허용)
- `scripts/simulation-accounts.json`의 deployer 계정으로 배포
- Creditcoin 테스트넷(chainId: 102031) 환경
- 컨트랙트는 Solidity 0.8.24, Foundry로 컴파일/배포
- Liquity 배포는 `contracts/src` 계열 (non-legacy). 이벤트는 `ITroveEvents.sol`의 `TroveOperation` 사용
