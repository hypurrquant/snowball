# Step 02: 테스트넷 배포 + 주소 업데이트

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (이전 주소로 복원)
- **선행 조건**: Step 01

---

## 1. 구현 내용 (design.md 기반)
- 배포 스크립트 업데이트 (deploy-agent-vault-v2.ts → v3.ts): 새 ABI artifact 사용, getPermNonce 검증
- Creditcoin 테스트넷 재배포
- addresses.ts: LIQUITY.shared.agentVault + ERC8004.agentVault 주소 업데이트
- config.ts: agent-runtime agentVault 주소 업데이트

## 2. 완료 조건
- [ ] F25: 테스트넷 재배포 완료, 새 주소에서 getPermNonce 호출 성공
- [ ] addresses.ts의 agentVault 주소 2곳 업데이트
- [ ] config.ts의 agentVault 주소 업데이트

## 3. 롤백 방법
- 이전 주소로 addresses.ts, config.ts 복원

---

## Scope

### 수정 대상 파일
```
scripts/deploy-agent-vault-v2.ts          # 기존 파일 수정 (파일명 유지, 내용만 v3 ABI 반영)
packages/core/src/config/addresses.ts     # 수정 - 새 주소
packages/agent-runtime/src/config.ts      # 수정 - 새 주소
```

### Side Effect 위험
- 배포 후 구 ABI로 호출하면 실패 → Step 03에서 ABI 즉시 업데이트

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 포함 근거 | 판정 |
|-----------|----------|------|
| scripts/deploy-agent-vault-v2.ts | F25 배포 스크립트 업데이트 (→v3) | ✅ OK |
| packages/core/src/config/addresses.ts | F25 agentVault 주소 2곳 업데이트 | ✅ OK |
| packages/agent-runtime/src/config.ts | F25 runtime agentVault 주소 | ✅ OK |

### False Negative (누락)
| 후보 파일 | 제외 근거 | 판정 |
|----------|----------|------|
| apps/web/src/core/config/addresses.ts | `@snowball/core` re-export — core 수정 시 자동 반영 | ✅ 제외 OK |
| scripts/deploy-full.ts | 전체 배포 스크립트, AgentVault v3 개별 배포와 무관 | ✅ 제외 OK |
| scripts/deploy-phase9-12.ts | 이전 phase 배포, 이번 배포와 무관 | ✅ 제외 OK |
| packages/liquity/scripts/deploy-viem.ts | Liquity 컨트랙트 배포, AgentVault 아님 | ✅ 제외 OK |

### 검증 통과: ✅

---

→ 다음: [Step 03: ABI 업데이트](step-03-abi.md)
