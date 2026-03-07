# 설계 - v0.12.0

## 변경 규모
**규모**: 일반 기능 + 운영 리스크
**근거**: 4개 패키지에 걸친 수정 + 컨트랙트 재배포 (온체인 상태 리셋)

---

## 문제 요약
스케줄러가 env 하드코딩 단일 유저만 처리하고, AgentVault에 유저 목록 조회 함수가 없어 멀티유저 자동 실행이 불가하다.

> 상세: [README.md](README.md) 참조

## 접근법
AgentVault 컨트랙트에 `getDelegatedUsers(agent)` view 함수를 추가하고, 스케줄러가 cron tick마다 온체인 유저 목록을 조회하여 유저별 순차 실행하는 루프를 구현한다. troveId는 TroveManager/TroveNFT를 통해 global scan 1회로 user→troveId map을 구축한다.

## 대안 검토

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: 온체인 getDelegatedUsers | 단일 RPC 호출, revoke/expiry 즉시 반영, RPC 로그 보존 무관 | 컨트랙트 재배포 필요, 배열 단조 증가 | ✅ |
| B: 이벤트 로그 스캔 | 컨트랙트 변경 없음, 기존 상태 보존 | N+1 RPC 호출, grant-revoke-re-grant 중복 처리, RPC 로그 보존 의존 | ❌ |
| C: 하이브리드 (이벤트+커서) | 반복 실행 시 RPC 절감 | 커서 관리 복잡, 서버 재시작 시 리셋, 테스트넷 규모에서 과잉 설계 | ❌ |

**선택 이유**: A를 선택한 이유 3가지:
1. 재배포 비용이 이미 확정됨 (테스트넷, 기존 상태 리셋 허용)
2. 단일 `readContract` 호출로 운영 복잡성 최소화
3. `block.timestamp` 기준 expiry 체크로 시간 기반 불일치 원천 차단

## 기술 결정

| # | 결정 | 근거 |
|---|------|------|
| TD-1 | `_delegatedUsers` 배열에서 revoke 시 요소 미삭제, `getDelegatedUsers`에서 active 필터링 | 배열 요소 삭제(swap+pop) gas 비용 불필요. view 함수 필터링이 더 안전 |
| TD-2 | troveId 스캔은 cron tick당 1회 global scan → `Map<user, troveId>` 구축 | per-user 스캔 대비 O(troves) vs O(users × troves). Codex Step 1 피드백 반영 |
| TD-3 | `AgentConfig.liquity`에 `troveNFT` 주소 추가 | `ownerOf(troveId)` 호출에 필요. 현재 config에 누락 |
| TD-4 | agent-runtime abis.ts에 `getTroveIdsCount`, `ownerOf` 추가 | trove 스캔에 필요한 ABI 현재 누락 |
| TD-5 | `AGENT_CRON_USER` env fallback 제거 | 온체인 getDelegatedUsers가 source of truth. env fallback은 demo 잔재이며 stale user가 스케줄 대상이 되는 위험 |
| TD-7 | vault.ts의 expiry 체크를 `expiry >= now` (≥)로 정렬 | 컨트랙트 executeOnBehalf는 `block.timestamp <= perm.expiry` 사용. vault observer도 동일 semantics로 맞춤 |
| TD-8 | 스케줄러가 `loadConfig()` 직접 호출 + 자체 `publicClient` 생성 | runtime.ts의 config는 private, publicClient는 run() 내부 생성. AgentRuntime 내부를 관통하지 않고 loadConfig()로 독립 조회 |
| TD-6 | 단일 branch(wCTC) troveId 스캔만 구현 | 현재 manifest `"liquityBranch": "wCTC"`만 지원 |

---

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────┐
│  AgentVault V2 (Solidity)                               │
│                                                         │
│  기존: _balances, _permissions, deposit/withdraw/       │
│        grantPermission/revokePermission/executeOnBehalf │
│                                                         │
│  추가: _delegatedUsers[agent] → address[]               │
│        _isDelegated[agent][user] → bool                 │
│        getDelegatedUsers(agent) → address[] (active만)  │
└─────────────────────┬───────────────────────────────────┘
                      │ readContract
┌─────────────────────▼───────────────────────────────────┐
│  SchedulerService (NestJS @Cron)                        │
│                                                         │
│  1. getDelegatedUsers(agentEOA) → users[]               │
│  2. buildTroveMap(troveManager, troveNFT) → Map         │
│  3. for user in users:                                  │
│       troveId = troveMap.get(user) ?? 0n                │
│       agentService.runAgent(user, manifest, troveId)    │
└─────────────────────────────────────────────────────────┘

TroveManager ──getTroveIdsCount()──→ count
             ──getTroveFromTroveIdsArray(i)──→ troveId
TroveNFT    ──ownerOf(troveId)──→ owner
             → Map<owner, troveId>
```

변경이 걸치는 4개 패키지:

| 패키지 | 변경 내용 |
|--------|----------|
| `packages/liquity` | AgentVault.sol + IAgentVault.sol 수정 |
| `packages/core` | addresses.ts 주소 교체, abis/agent.ts ABI 추가 |
| `packages/agent-runtime` | config.ts(troveNFT), abis.ts(ABI), types.ts(타입) |
| `apps/agent-server` | scheduler.service.ts 멀티유저 루프 |

## 컨트랙트 변경 명세

### IAgentVault.sol 추가
```solidity
function getDelegatedUsers(address agent) external view returns (address[] memory);
```

### AgentVault.sol 변경

**새 스토리지:**
```solidity
mapping(address => address[]) private _delegatedUsers;        // agent → 위임한 유저 배열
mapping(address => mapping(address => bool)) private _isDelegated; // agent → user → 등록 여부
```

**grantPermission 수정** (기존 함수 끝부분에 추가):
```solidity
if (!_isDelegated[agent][msg.sender]) {
    _delegatedUsers[agent].push(msg.sender);
    _isDelegated[agent][msg.sender] = true;
}
```

**getDelegatedUsers 구현:**
```solidity
function getDelegatedUsers(address agent) external view override returns (address[] memory) {
    address[] storage all = _delegatedUsers[agent];
    // 1st pass: count active
    uint256 count = 0;
    for (uint256 i = 0; i < all.length; i++) {
        Permission storage perm = _permissions[all[i]][agent];
        if (perm.active && (perm.expiry == 0 || block.timestamp <= perm.expiry)) {
            count++;
        }
    }
    // 2nd pass: collect
    address[] memory result = new address[](count);
    uint256 idx = 0;
    for (uint256 i = 0; i < all.length; i++) {
        Permission storage perm = _permissions[all[i]][agent];
        if (perm.active && (perm.expiry == 0 || block.timestamp <= perm.expiry)) {
            result[idx++] = all[i];
        }
    }
    return result;
}
```

## 데이터 흐름

```
@Cron(EVERY_HOUR)
  │
  ├─ 1. readContract(agentVault, "getDelegatedUsers", [agentEOA])
  │      → address[] users
  │      └─ 0명이면 cron skip + debug log
  │
  ├─ 2. buildTroveMap()  ← cron tick당 1회
  │      ├─ readContract(troveManager, "getTroveIdsCount") → count
  │      ├─ for i in 0..count:
  │      │    readContract(troveManager, "getTroveFromTroveIdsArray", [i]) → troveId
  │      │    readContract(troveNFT, "ownerOf", [troveId]) → owner
  │      └─ Map<owner.toLowerCase(), troveId>
  │
  └─ 3. for each user in users:
         ├─ troveId = troveMap.get(user.toLowerCase()) ?? 0n
         ├─ agentService.runAgent(user, manifestId, troveId)
         └─ log: success / no_action / error (다음 유저 계속)
```

## API/인터페이스 계약

### Solidity
```solidity
// 새 view 함수
function getDelegatedUsers(address agent) external view returns (address[] memory);
// 반환: active permission이 있는 유저 주소 배열 (expiry 미도래 + active=true)
```

### TypeScript (스케줄러 내부)
```typescript
// TroveScanner — cron tick당 1회 호출
async function buildTroveMap(
  publicClient: PublicClient,
  troveManagerAddress: Address,
  troveNFTAddress: Address,
): Promise<Map<string, bigint>>  // lowercased user address → troveId
```

## 스케줄러 의존성 주입

`SchedulerService`는 `AgentRuntime` 내부를 관통하지 않는다. 대신 `loadConfig()`를 직접 호출하여 자체 `publicClient`를 생성한다:

```typescript
// scheduler.service.ts
import { loadConfig } from "@snowball/agent-runtime";
import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

@Injectable()
export class SchedulerService {
  private readonly config = loadConfig();
  private readonly publicClient = createPublicClient({
    transport: http(this.config.rpcUrl),
  });
  private readonly agentEOA = privateKeyToAccount(this.config.agentPrivateKey).address;
  // getDelegatedUsers(this.agentEOA) 로 온체인 유저 목록 조회
  // ...
}
```

이 방식의 장점:
- `AgentRuntime`/`AgentService`의 내부 구조 변경 불필요
- 스케줄러가 읽기 전용 온체인 조회에만 사용하므로 별도 client가 자연스러움
- `loadConfig()`는 이미 public export (`packages/agent-runtime/src/config.ts`)

## 배포 순서 / 체크리스트

1. Foundry로 AgentVault V2 컴파일 (`forge build`)
2. deployer 계정으로 배포 (`scripts/deploy-agent-vault-v2.ts`)
3. 새 주소 기록
4. 주소 업데이트 (4곳):
   - `packages/core/src/config/addresses.ts` → `ERC8004.agentVault`
   - `packages/core/src/config/addresses.ts` → `LIQUITY.shared.agentVault` (있는 경우)
   - `packages/agent-runtime/src/config.ts` → `agentVault`
5. ABI 업데이트 (2곳):
   - `packages/core/src/abis/agent.ts` → `getDelegatedUsers` 추가
   - `packages/agent-runtime/src/abis.ts` → `getDelegatedUsers`, `getTroveIdsCount`, `ownerOf` 추가
6. Smoke test: `getDelegatedUsers(agentEOA)` 호출 성공 확인
7. tsc --noEmit 통과

## 실패/에러 처리

| 시나리오 | 대응 |
|---------|------|
| getDelegatedUsers 빈 배열 | cron skip + debug log. 온체인 상태가 source of truth |
| getDelegatedUsers RPC 실패 | catch → error log → cron skip. 다음 tick에서 재시도 |
| troveId 스캔 RPC 실패 | troveMap 구축 실패 → 모든 유저에 troveId=0n (Morpho는 정상, Liquity만 skip) |
| 특정 유저 runAgent 실패 | 해당 유저만 error log, 다음 유저 계속 (기존 try-catch 패턴) |
| activeRuns 동시성 충돌 | ConflictException catch → skip |

## 테스트 전략

| 레벨 | 범위 | 방법 |
|------|------|------|
| 컨트랙트 단위 | getDelegatedUsers 정확성 | Foundry forge test: grant → getDelegatedUsers, revoke → 제외, expiry → 제외 |
| ABI 정합성 | 새 ABI 항목이 컨트랙트와 일치 | tsc --noEmit |
| 스케줄러 통합 | 멀티유저 루프 로직 | 배포 후 수동 실행: 2+ 유저 delegation 설정 → cron trigger → 유저별 실행 확인 |
| troveId 스캔 | user→troveId 매핑 정확성 | 배포 후 수동: openTrove → buildTroveMap → ownerOf 일치 확인 |

## 변경 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `packages/liquity/contracts/interfaces/IAgentVault.sol` | 수정 | getDelegatedUsers 시그니처 추가 |
| `packages/liquity/contracts/custom/AgentVault.sol` | 수정 | 스토리지 2개 + grantPermission 훅 + getDelegatedUsers |
| `packages/core/src/config/addresses.ts` | 수정 | ERC8004.agentVault 새 주소 |
| `packages/core/src/abis/agent.ts` | 수정 | getDelegatedUsers ABI 추가 |
| `packages/core/src/abis/liquity.ts` | 수정 | TroveNFTABI에 ownerOf 추가 |
| `packages/agent-runtime/src/config.ts` | 수정 | agentVault 새 주소 + liquity.troveNFT 추가 |
| `packages/agent-runtime/src/types.ts` | 수정 | AgentConfig.liquity에 troveNFT 필드 |
| `packages/agent-runtime/src/abis.ts` | 수정 | getDelegatedUsers, getTroveIdsCount, ownerOf ABI |
| `packages/agent-runtime/src/observers/vault.ts` | 수정 | expiry 체크 `> now` → `>= now` 정렬 (executeOnBehalf와 동일 semantics) |
| `apps/agent-server/src/scheduler/scheduler.service.ts` | 대규모 수정 | 멀티유저 루프 + troveId 스캔 + AGENT_CRON_USER 제거 |
| `scripts/deploy-agent-vault-v2.ts` | 신규 | 배포 스크립트 |

## 리스크/오픈 이슈

| 리스크 | 심각도 | 완화 |
|--------|--------|------|
| 주소 동기화 누락 | 높음 | 배포 체크리스트 + grep 검증 |
| _delegatedUsers 배열 무한 증가 | 낮음 | 테스트넷 100명 이하. 프로덕션 시 pagination 또는 배열 정리 필요 |
| Creditcoin RPC 안정성 | 낮음 | 실패 시 cron skip, 다음 tick 재시도 |
| 컨트랙트 버그 | 중간 | Foundry 단위 테스트로 커버 |

---

## N/A 섹션

- **성능/스케일**: N/A — 테스트넷 100명 이하, 최적화 불필요
- **데이터 모델/스키마**: N/A — DB 없음
- **보안/권한**: N/A — getDelegatedUsers는 view 함수, 새 공격 표면 없음
- **관측성**: N/A — Logger.log/error로 충분, 별도 메트릭 불필요
- **롤아웃/롤백**: N/A — 테스트넷, 재배포가 곧 롤백
- **Ownership Boundary**: N/A — 단일 팀
- **Contract Reference**: N/A — 외부 계약 없음
- **Dependency Map**: N/A — 외부 서비스 의존 없음
- **운영 Runbook**: N/A — 운영팀 없음
