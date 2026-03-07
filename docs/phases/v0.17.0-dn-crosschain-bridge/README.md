# DN Crosschain Bridge Pipeline - v0.17.0

## 문제 정의

### 현상

Snowball Protocol은 CTC 홀더가 자산을 유동화하여 외부 체인에서 수익을 창출하는 것을 목표로 한다. 현재까지 CTC → wCTC → sbUSD(Liquity)까지의 유동화 흐름은 구현되어 있고, DEX에서 sbUSD ↔ USDC 스왑도 가능하다.

그러나 **USDC를 외부 체인으로 보내고, 델타뉴트럴(DN) 전략으로 수익을 창출한 뒤, 그 수익을 다시 Creditcoin으로 가져오는 크로스체인 흐름**이 존재하지 않는다. USC Bridge Worker(v0.11.1)에서 Sepolia → USC Testnet 단방향 브릿지 PoC는 성공했으나, 사용자가 직접 참여할 수 있는 End-to-End 파이프라인 UI는 없다.

### 원인

1. **다중 체인 환경**: CC Testnet(102031), Sepolia(11155111), USC Testnet(102036) 3개 체인이 관여하며, 각각 역할이 다름
2. **Wormhole 부재**: 테스트넷에 Wormhole이 없어 CC Testnet → 외부 체인 방향의 자산 이동을 시뮬레이션해야 함
3. **USC 방향성 제약**: USC는 외부 → Creditcoin 방향만 trustless 검증 가능. 나가는 방향은 별도 메커니즘 필요
4. **DN Token 발행 제한**: 현재 Sepolia DN Token에 public mint 함수가 없음

### 영향

- CTC 홀더는 sbUSD까지만 유동화 가능하고, 실제 외부 DeFi 수익 창출 경로가 없음
- Snowball Protocol의 핵심 가치 제안("CTC 유동성을 실제 수익으로 전환")을 데모할 수 없음
- USC 인프라가 프로덕트와 연결되지 않아 기술 검증만 존재하고 사용자 흐름은 부재

### 목표

1. **E2E 크로스체인 데모 구현**: 사용자가 USDC를 예치하면 → DN 토큰이 발행되고 → USC를 통해 Creditcoin에 도착하는 전체 흐름을 체험할 수 있다
2. **멀티체인 파이프라인 UI**: TX Pipeline UI를 활용해 3개 체인에 걸친 트랜잭션 진행 상태를 실시간으로 보여준다
3. **서버 없는 프론트엔드 주도 아키텍처**: 사용자가 직접 서명하고, FE가 3개 체인 RPC로 상태를 추적하며, USC Worker만 자동 처리
4. **보안 모델 시연**: 나가는 방향(Wormhole/Vault 시뮬레이션) vs 들어오는 방향(USC trustless 검증)의 이중 보안 구조

### 비목표 (Out of Scope)

- **Wormhole 실제 통합**: 테스트넷에 Wormhole이 없으므로 vault deposit으로 시뮬레이션
- **프로덕션 브릿지 컨트랙트**: 보안 감사 수준의 컨트랙트가 아닌 데모용 구현
- **외부 체인 DN Vault 전략 구현**: 실제 델타뉴트럴 전략 실행이 아닌 DN 토큰 발행으로 시뮬레이션
- **CC Testnet ↔ USC Testnet 통합**: 두 테스트넷이 별개이므로, 최종 DN 토큰은 USC Testnet에 도착
- **sbUSD → USDC 스왑 자동화**: DEX 스왑은 기존 기능으로 사용자가 별도 수행

## 사용자 흐름 (테스트 시나리오)

```
[CC Testnet]     사용자: USDC를 BridgeVault에 deposit       [서명 1]
                      ↓ (체인 스위치 안내)
[Sepolia]        사용자: DN Token mint (시뮬레이션)           [서명 2]
[Sepolia]        사용자: DN bridgeBurn()                     [서명 3]
                      ↓ (USC Worker 자동 처리, ~4-5분)
[USC Testnet]    자동: DN Token mint (processBridgeMint)     [자동]
```

**사용자 서명 3회, 체인 스위치 1회, 자동 처리 1건**

## 제약사항

- **3개 서로 다른 테스트넷**: CC Testnet(102031), Sepolia(11155111), USC Testnet(102036)
- **USC Attestation 대기**: ~4-5분 소요 (Attestor Network 속도에 의존)
- **기존 DN Token/DNBridgeUSC 재사용**: 이미 배포된 컨트랙트 활용 (DN Token은 mint 함수 추가 필요)
- **USC Worker 별도 실행 필요**: `apps/usc-worker`를 로컬에서 실행해야 bridgeBurn → mint 자동 처리
