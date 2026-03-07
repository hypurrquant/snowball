# Step 02: 컨트랙트 배포 + 주소 전환

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (이전 주소로 되돌리면 됨)
- **선행 조건**: Step 01 완료

---

## 1. 구현 내용 (design.md 기반)
- `scripts/deploy-agent-vault-v2.ts` 배포 스크립트 작성 (deployer 계정 사용)
- Creditcoin 테스트넷에 AgentVault V2 배포
- 새 주소를 다음 위치에 반영:
  - `packages/core/src/config/addresses.ts` → `ERC8004.agentVault` + `LIQUITY.shared.agentVault`
  - `packages/agent-runtime/src/config.ts` → `agentVault`

## 2. 완료 조건
- [ ] 배포 스크립트 `scripts/deploy-agent-vault-v2.ts`가 존재한다
- [ ] AgentVault V2가 Creditcoin 테스트넷에 배포되었다
- [ ] `readContract(newAddress, "getDelegatedUsers", [anyAddr])` RPC 호출이 성공한다
- [ ] `packages/core/src/config/addresses.ts`의 `ERC8004.agentVault`가 새 주소다
- [ ] `packages/core/src/config/addresses.ts`의 `LIQUITY.shared.agentVault`가 새 주소다
- [ ] `packages/agent-runtime/src/config.ts`의 `agentVault`가 새 주소다
- [ ] 3곳 모두 동일한 주소다

## 3. 롤백 방법
- 주소를 이전 값 `0xf8e322c36485fa4c3971f75819c5de5a9be2b870`로 되돌림

---

## Scope

### 수정 대상 파일
```
packages/core/src/config/addresses.ts   # 수정 - ERC8004.agentVault + LIQUITY.shared.agentVault
packages/agent-runtime/src/config.ts    # 수정 - agentVault 주소
```

### 신규 생성 파일
```
scripts/deploy-agent-vault-v2.ts        # 신규 - 배포 스크립트
```

### 참고할 기존 패턴
- `scripts/deploy-phase9-12.ts`: 기존 배포 스크립트 패턴 참조

### Side Effect 위험
- 주소 변경 시 기존 deposit/permission 상태 리셋됨 (테스트넷이므로 허용)
- 프론트엔드도 같은 addresses.ts를 참조하므로 자동 반영

---

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| addresses.ts | ERC8004 + LIQUITY.shared 주소 변경 | ✅ OK |
| config.ts | agentVault 주소 변경 | ✅ OK |
| deploy script | 배포 실행 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| 배포 스크립트 | ✅ scripts/ | OK |
| 주소 3곳 업데이트 | ✅ addresses.ts + config.ts | OK |

### 검증 통과: ✅

---

→ 다음: [Step 03: ABI 업데이트](step-03-abi.md)
