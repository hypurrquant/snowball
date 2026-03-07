# Step 01: AgentVault V2 컨트랙트 수정

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅ (테스트넷, 재배포 가능)
- **선행 조건**: 없음

---

## 1. 구현 내용 (design.md 기반)

### IAgentVault.sol
- `getDelegatedUsers(address agent) external view returns (address[] memory)` 시그니처 추가

### AgentVault.sol
- 새 스토리지: `_delegatedUsers[agent] → address[]`, `_isDelegated[agent][user] → bool`
- `grantPermission` 끝부분에 delegatedUsers 등록 로직 추가 (중복 방지: `_isDelegated` 체크)
- `getDelegatedUsers` 구현: 2-pass 필터링 (active=true AND expiry 미도래)

## 2. 완료 조건
- [ ] `IAgentVault.sol`에 `getDelegatedUsers` 시그니처가 존재한다
- [ ] `AgentVault.sol`에 `_delegatedUsers`, `_isDelegated` 스토리지가 추가되었다
- [ ] `grantPermission` 호출 시 `_isDelegated` 체크 후 중복 없이 배열에 추가된다
- [ ] `getDelegatedUsers`가 active=true AND (expiry==0 OR block.timestamp<=expiry)인 유저만 반환한다
- [ ] `forge build` 성공

## 3. 롤백 방법
- git revert로 원복. 테스트넷이므로 기존 컨트랙트 영향 없음

---

## Scope

### 수정 대상 파일
```
packages/liquity/contracts/
├── interfaces/IAgentVault.sol  # 수정 - getDelegatedUsers 시그니처 추가
└── custom/AgentVault.sol       # 수정 - 스토리지 2개 + grantPermission 훅 + getDelegatedUsers 구현
```

### 신규 생성 파일
없음

### Side Effect 위험
- `grantPermission`에 코드 추가 → 기존 permission grant 동작에 gas 증가 (미미)
- 기존 테스트가 있다면 영향 없음 (additive change)

---

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| IAgentVault.sol | getDelegatedUsers 시그니처 | ✅ OK |
| AgentVault.sol | 스토리지 + grantPermission + getDelegatedUsers | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| getDelegatedUsers 시그니처 | ✅ IAgentVault.sol | OK |
| 스토리지 추가 | ✅ AgentVault.sol | OK |
| grantPermission 수정 | ✅ AgentVault.sol | OK |
| getDelegatedUsers 구현 | ✅ AgentVault.sol | OK |

### 검증 통과: ✅

---

→ 다음: [Step 02: 컨트랙트 배포 + 주소 전환](step-02-deploy.md)
