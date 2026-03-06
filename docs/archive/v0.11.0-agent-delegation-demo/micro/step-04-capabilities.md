# Step 04: 4개 Capability 구현

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅ (파일 삭제)
- **선행 조건**: Step 01 (타입), Step 02 (Registry)
- **DoD 매핑**: F4, F5, F6, F7

---

## 1. 구현 내용 (design.md 기반)

- `src/capabilities/morpho-supply.ts` — morpho.supply capability
  - requiredPermissions: `[Morpho] × [supply, withdraw]`
  - preconditions: amount > 0, vault balance 충분, permission active, Morpho isAuthorized
  - buildCalls: `approveFromVault → executeOnBehalf(supply) → approveFromVault(0)`
- `src/capabilities/morpho-withdraw.ts` — morpho.withdraw capability
  - preconditions: Morpho position > 0, Morpho isAuthorized
  - buildCalls: `executeOnBehalf(withdraw)`
- `src/capabilities/liquity-adjust-interest-rate.ts` — liquity.adjustInterestRate capability
  - preconditions: trove 존재, cooldown 경과, delegate 설정됨
  - buildCalls: hint 계산 + `executeOnBehalf(adjustTroveInterestRate)`
- `src/capabilities/liquity-add-collateral.ts` — liquity.addCollateral capability
  - preconditions: vault wCTC balance 충분, addManager 설정됨
  - buildCalls: `approveFromVault → executeOnBehalf(addColl) → approveFromVault(0)`
- `src/utils/liquity-hints.ts` — HintHelpers readContract 이식 (upperHint/lowerHint 계산)

## 2. 완료 조건

- [ ] `morpho-supply.ts`가 `approveFromVault → executeOnBehalf(supply) → approveFromVault(0)` 3개 PreparedCall 반환
- [ ] `morpho-withdraw.ts`가 `executeOnBehalf(withdraw)` 1개 PreparedCall 반환
- [ ] `liquity-adjust-interest-rate.ts`가 hint 포함 `executeOnBehalf(adjustTroveInterestRate)` PreparedCall 반환
- [ ] `liquity-add-collateral.ts`가 `approveFromVault → executeOnBehalf(addColl) → approveFromVault(0)` PreparedCall 반환
- [ ] 각 capability의 `inputSchema`가 유효한 JSON Schema
- [ ] 각 capability의 `requiredPermissions()`가 올바른 target/selectors 반환
- [ ] 각 capability의 `preconditions()`가 CheckResult[] 반환
- [ ] `liquity-hints.ts`의 hint 계산 로직이 기존 FE 패턴과 동일
- [ ] `tsc --noEmit` 통과

## 3. 롤백 방법
- `src/capabilities/` 디렉토리 + `src/utils/liquity-hints.ts` 삭제

---

## Scope

### 신규 생성 파일
```
packages/agent-runtime/src/
├── capabilities/
│   ├── morpho-supply.ts              # 신규
│   ├── morpho-withdraw.ts            # 신규
│   ├── liquity-adjust-interest-rate.ts  # 신규
│   ├── liquity-add-collateral.ts     # 신규
│   └── index.ts                      # 신규 — 4개 capability barrel export
└── utils/
    └── liquity-hints.ts              # 신규 — hint 계산
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| types.ts | 직접 import | Capability, PreparedCall, CheckResult |
| config.ts | 직접 import | contract addresses |
| registry.ts | 간접 | Step 07에서 buildDemoRegistry()가 이 capabilities를 등록 |
| ABI (agent.ts) | 참조 | AgentVault ABI (approveFromVault, executeOnBehalf) |
| ABI (liquity.ts) | 참조 | BorrowerOps ABI |
| ABI (lend.ts) | 참조 | Morpho ABI |

### 참고할 기존 패턴
- design.md의 `morphoSupply` 코드 예시
- `apps/web/src/domains/defi/borrow/hooks/useTroveActions.ts` — HintHelpers 패턴

### Side Effect 위험
- hint 계산 로직이 기존 FE와 일치하지 않으면 adjustTroveInterestRate revert 가능

## FP/FN 검증

### 검증 체크리스트
- [x] morpho-supply.ts — F4 (3 PreparedCall)
- [x] morpho-withdraw.ts — F5 (1 PreparedCall)
- [x] liquity-adjust-interest-rate.ts — F6 (hint + 1 PreparedCall)
- [x] liquity-add-collateral.ts — F7 (3 PreparedCall)
- [x] liquity-hints.ts — hint 계산 유틸

### 검증 통과: ✅

---

> 다음: [Step 05: Planner — Claude API tool use](step-05-planner.md)
