# Step 04: agent-runtime 수정

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅
- **선행 조건**: Step 03

---

## 1. 구현 내용 (design.md 기반)
- types.ts: PermissionState 타입에 tokenAllowances 추가, spendingCap/spent 제거
- observers/vault.ts: getPermission 호출에 tokens 파라미터 추가, 반환값 파싱 변경
- capabilities/liquity-add-collateral.ts: approveFromVault 3회 → approveAndExecute 1회
- capabilities/morpho-supply.ts: approveFromVault 3회 → approveAndExecute 1회

## 2. 완료 조건
- [ ] F18: types.ts PermissionState가 ExecutionPermission + TokenAllowance 반영
- [ ] F19: vault.ts getPermission에 tokens 파라미터 전달
- [ ] F20: liquity-add-collateral.ts approveAndExecute 1회 호출
- [ ] F21: morpho-supply.ts approveAndExecute 1회 호출

## 3. 롤백 방법
- git restore로 파일 복원

---

## Scope

### 수정 대상 파일
```
packages/agent-runtime/src/
├── types.ts                                # 수정 - PermissionState 타입
├── observers/vault.ts                      # 수정 - getPermission 호출
└── capabilities/
    ├── liquity-add-collateral.ts           # 수정 - approveAndExecute
    └── morpho-supply.ts                    # 수정 - approveAndExecute
```

### Side Effect 위험
- agent-runtime index.ts re-export가 변경된 타입을 노출 → agent-server 빌드에 영향 (Step 05)

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 포함 근거 | 판정 |
|-----------|----------|------|
| types.ts | F18 — PermissionState 타입 변경 | ✅ OK |
| observers/vault.ts | F19 — getPermission 호출 변경 | ✅ OK |
| capabilities/liquity-add-collateral.ts | F20 — approveFromVault → approveAndExecute | ✅ OK |
| capabilities/morpho-supply.ts | F21 — approveFromVault → approveAndExecute | ✅ OK |

### False Negative (누락)
| 후보 파일 | 제외 근거 | 판정 |
|----------|----------|------|
| capabilities/liquity-adjust-interest-rate.ts | agentVault 참조하지만 approveFromVault/transferFromVault 미사용 (executeOnBehalf만) | ✅ 제외 OK |
| capabilities/morpho-withdraw.ts | agentVault 참조하지만 approveFromVault/transferFromVault 미사용 (executeOnBehalf만) | ✅ 제외 OK |
| observers/liquity.ts | agentVault 주소 참조만 — Permission 타입 미사용 | ✅ 제외 OK |
| observers/morpho.ts | agentVault 주소 참조만 — Permission 타입 미사용 | ✅ 제외 OK |
| index.ts | re-export — 타입 변경 시 자동 반영 | ✅ 제외 OK |

### 검증 통과: ✅

---

→ 다음: [Step 05: agent-server 빌드 검증](step-05-server.md)
