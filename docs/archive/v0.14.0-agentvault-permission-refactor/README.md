# AgentVault Permission Refactor - v0.14.0

## 문제 정의

### 현상
AgentVault의 Permission 모델이 단일 `spendingCap`/`spent`로 설계되어 있어, 에이전트가 vault에서 토큰을 사용할 때 **토큰 종류를 구분하지 않고** amount를 합산한다.

```solidity
// 현재: user → agent → 단일 Permission
struct Permission {
    address[] allowedTargets;   // 허용 컨트랙트 배열
    bytes4[] allowedFunctions;  // 허용 함수 배열
    uint256 spendingCap;        // 토큰 무관 단일 한도
    uint256 spent;              // 토큰 무관 단일 누적
    uint256 expiry;
    bool active;
}
```

### 원인
1. **토큰별 cap 부재**: `spendingCap`이 단일 uint256이라 18-decimal 토큰과 6-decimal 토큰의 amount가 같은 counter로 합산됨
2. **실행 권한과 지출 권한 혼재**: `executeOnBehalf`(토큰 무관)와 `approveFromVault`/`transferFromVault`(토큰 관련)가 같은 Permission struct를 공유
3. **target/function 매핑 불명확**: allowedTargets과 allowedFunctions가 독립 배열이라, "target A의 function X만 허용"이 아닌 "모든 target에 모든 function 허용"으로 동작
4. **자금 이동 보안 취약점**:
   - `approveFromVault`: vault가 pooled custody — 모든 유저의 토큰이 같은 컨트랙트에 있어 `forceApprove`가 다른 유저 자금에도 영향 가능
   - `transferFromVault`: `to` 파라미터 미검증 — 에이전트가 vault 자금을 임의 주소로 전송 가능

### 영향
- **보안 리스크 (Cap)**: 에이전트가 저가 토큰으로 cap을 채운 후 고가 토큰을 사용하는 시나리오 가능
- **보안 리스크 (자금 이동)**: pooled-custody 구조에서 approve/transfer의 목적지 제한 없음
- **UX 제약**: 사용자가 "wCTC는 10개, sbUSD는 1000개"처럼 토큰별 한도를 설정할 수 없음
- **권한 과잉**: target/function이 cross-product로 허용되어 의도하지 않은 조합이 허용됨
- **확장성**: 새 토큰/프로토콜 추가 시 기존 Permission 재설정 필요

### 목표
1. **관심사 분리**: 실행 권한(target+function)과 토큰 지출 권한(token+cap)을 독립 모델로 분리
2. **토큰별 cap**: 각 ERC-20 토큰에 대해 개별 spendingCap/spent 관리
3. **자금 이동 보안 강화**: approveFromVault/transferFromVault를 재설계하여 pooled-custody 리스크와 목적지 미검증 문제 해결
4. **효율적 권한 설정**: 사용자가 여러 권한을 하나의 설정 흐름으로 안전하게 구성할 수 있어야 함
5. **전체 스택 연동**: 컨트랙트 → ABI → agent-runtime → agent-server → 프론트엔드 UI까지 일관 반영

### 비목표 (Out of Scope)
- Native coin(CTC/ETH) 지원 — ERC-20만 처리
- 새로운 capability 추가 (기존 5개 유지)
- 에이전트 스케줄러 로직 변경 (Permission 모델 변경에 따른 호출부만 수정)
- Options 모듈 관련 코드
- getDelegatedUsers 기능 제거 (v0.12.0 기능 유지)

## Breaking Change 정책
테스트넷 전용이므로 **하위 호환 불필요 — 전면 교체**.
- `Permission` struct: 분리된 새 모델로 교체
- `grantPermission`: 새 시그니처로 교체
- `getPermission`: 새 반환 타입으로 교체
- `PermissionGranted` 이벤트: 새 파라미터로 교체
- `approveFromVault` / `transferFromVault`: 보안 개선된 새 설계로 교체
- 유지: `deposit`, `withdraw`, `executeOnBehalf`, `getDelegatedUsers`, `getBalance`

## 제약사항
- Creditcoin 테스트넷 배포 필요 (chainId: 102031)
- Solidity 0.8.24 (기존 컴파일러 버전 유지)
- forge-std 미설치 — Foundry unit test 불가, 코드 리뷰 + RPC 검증으로 대체
