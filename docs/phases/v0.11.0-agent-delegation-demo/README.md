# Agent Delegation Demo — v0.11.0

## 문제 정의

### 현상
- v0.10.0에서 Agent(ERC-8004) 프론트엔드를 완성했으나, **에이전트가 실제로 유저 자산을 운용하는 end-to-end 플로우가 없다**
- 에이전트 등록, vault 예치, 권한 부여 UI는 있지만, 그 이후 "봇이 대신 DeFi를 실행한다"는 핵심 가치가 시연 불가
- 프론트엔드에 Liquity manager delegation, Morpho authorization 설정 UI가 없어서 위임 셋업도 불가

### 원인
1. **Bot script 부재**: `approveFromVault` + `executeOnBehalf` 를 호출하는 오프체인 스크립트가 없음
2. **Delegation 셋업 UI 부재**: Liquity의 setAddManager/setInterestIndividualDelegate, Morpho의 setAuthorization을 프론트엔드에서 호출하는 기능이 없음
3. **활동 이력 UI 부재**: 봇이 실행한 트랜잭션을 유저가 확인할 수 없음
4. **마켓플레이스→위임 연결 부재**: 에이전트 프로필 페이지에서 delegation 셋업으로 이어지는 UX 흐름이 없음

### 영향
- 프로토콜의 핵심 가치인 "AI 에이전트가 DeFi 포지션을 자동 관리"를 시연할 수 없음
- Buyer-Seller 플로우 (에이전트 탐색 → 선택 → 유동성 공급 → 위임 → 자동 운용 → 회수)가 end-to-end로 동작하지 않음
- 투자자/파트너 대상 데모, 해커톤 제출 시 "봇이 실제로 동작한다"를 보여줄 수 없음

### 목표

**G1. Morpho 위임 데모 (풀 사이클)**
- Buyer가 vault에 토큰 예치 → agent에 permission 부여 → Morpho.setAuthorization(AgentVault, true)
- Bot script: `approveFromVault` + `executeOnBehalf(Morpho.supply, onBehalf=user)`
- Bot script: `executeOnBehalf(Morpho.withdraw, receiver=user)`
- Buyer가 vault에서 잔액 회수

**G2. Liquity 위임 데모 (이자율 조정 + 담보 추가)**
- Buyer가 trove 보유 + setAddManager(AgentVault) + setInterestIndividualDelegate(AgentVault)
- Buyer가 vault에 wCTC 예치 + agent에 permission 부여
- Bot script: `executeOnBehalf(BorrowerOps.adjustTroveInterestRate)`
- Bot script: `approveFromVault` + `executeOnBehalf(BorrowerOps.addColl)`

**G3. 프론트엔드 위임 셋업 UI**
- Morpho: setAuthorization(AgentVault, true/false) 토글
- Liquity: setAddManager / setRemoveManagerWithReceiver / setInterestIndividualDelegate 설정
- 마켓플레이스에서 에이전트 선택 → delegation 셋업 페이지로 연결되는 UX 흐름
- 참고: 마켓플레이스에서 agent를 선택하더라도 실제 권한 부여 대상은 해당 agent의 endpoint EOA이며, Registry-Vault 온체인 연동은 이번 Phase 범위 밖

**G4. 에이전트 활동 로그**
- `ExecutedOnBehalf` 이벤트 기반 — 봇이 실행한 DeFi 호출 이력 표시
- 범위: AgentVault가 emit하는 이벤트만 대상 (유저의 setAuthorization, manager 설정 등 사전 셋업 tx는 제외)

### 비목표 (Out of Scope)

- **컨트랙트 수정/배포**: AgentVault 보안 수정(AV-01~04), spendingCap 재설계, Permission 모델 개선, Registry-Vault 연동 — 모두 현재 배포된 컨트랙트를 그대로 사용
- **SmartAccount 구현**: 새 컨트랙트 개발/배포 없음
- **풀 백엔드 서비스**: 상시 구동되는 봇 서비스 아님. 단순 viem CLI script로 데모
- **에이전트 검색/필터**: 마켓플레이스 필터링 고도화
- **실시간 모니터링**: SSE 기반 실시간 상태 UI
- **프로덕션 보안**: pooled custody, Cartesian product permission 등 알려진 한계는 이번에 수정하지 않음

## Happy-path 전제조건

데모 시나리오는 다음을 전제로 한다:
- **단일 유저**: 1명의 buyer가 1명의 agent에게 위임
- **사전 등록된 agent**: IdentityRegistry에 등록 완료된 에이전트 (마켓플레이스에서 선택)
- **Liquity active trove**: Buyer가 이미 wCTC 담보 trove를 보유
- **Morpho 대상 market 고정**: 특정 market(wCTC/sbUSD 등) 1개를 데모 대상으로 fix
- **단일 토큰 운용**: 데모에서는 1종의 ERC20만 사용 (spendingCap cross-token 문제 회피)

## 제약사항

- **컨트랙트 불변**: 현재 배포된 4개 컨트랙트(IdentityRegistry, ReputationRegistry, ValidationRegistry, AgentVault)를 수정 없이 사용
- **Liquity msg.sender 제약**: executeOnBehalf의 msg.sender는 AgentVault이므로, Liquity의 manager/delegate 메커니즘을 활용해야 함
- **Morpho authorization**: AgentVault가 유저 명의로 withdraw하려면 유저가 Morpho에서 setAuthorization을 사전 호출해야 함
- **Single-user scripted flow**: 봇은 자동화 서비스가 아닌, 수동 실행 스크립트 수준
- **테스트넷 전용**: Creditcoin Testnet (chainId: 102031)에서만 동작
- **데모용 리스크 수용**: `approveFromVault`의 pooled-custody 위험(AGENT_SYSTEM.md §4.2)을 인지하되, 테스트넷 데모 목적으로 수용. 운영 가드레일로 격리된 데모 지갑 사용, 단일 토큰 운용, 실행 후 잔여 allowance 정리(revoke or approve(0))를 적용
