# 작업 티켓 - v0.22.0 Yield Vault FE 개선

## 전체 현황

| # | Step | 난이도 | 롤백 | 선행 | Scope | FP/FN | 개발 | 완료일 |
|---|------|--------|------|------|-------|-------|------|--------|
| 01 | 설정 확장 + morphoMath 승격 | 🟢 | ✅ | — | ✅ | ✅ | ⏳ | - |
| 02 | useYieldVaultAPY 훅 | 🟠 | ✅ | 01 | ✅ | ✅ | ⏳ | - |
| 03 | VaultCard 개선 (APY+USD+Skeleton) | 🟡 | ✅ | 02 | ✅ | ✅ | ⏳ | - |
| 04 | VaultActionDialog 검증+withdrawAll | 🟠 | ✅ | — | ✅ | ✅ | ⏳ | - |
| 05 | page.tsx 통합 | 🟡 | ✅ | 02,03 | ✅ | ✅ | ⏳ | - |

## 의존성

```
01 → 02 → 03 → 05
                ↑
04 (독립) ──────┘
```

Step 04는 Step 01~03과 독립적으로 개발 가능. Step 05는 02, 03 완료 후 진행.

## 커버리지 매트릭스

### PRD 목표 → 티켓

| PRD 목표 | 관련 티켓 | 커버 |
|----------|----------|------|
| 1. Est. APY 표시 | Step 01 (설정), Step 02 (APY 훅), Step 03 (카드 표시), Step 05 (연결) | ✅ |
| 2. USD 환산 병행 표시 | Step 03 (카드 USD), Step 05 (페이지 USD 합산) | ✅ |
| 3. 입력 검증 | Step 04 (safe parsing, errors[], canSubmit) | ✅ |
| 4. 로딩 스켈레톤 | Step 03 (VaultCard loading), Step 05 (StatCard loading) | ✅ |
| 5. withdrawAll | Step 04 (isWithdrawAll 플래그, withdrawAll() 호출) | ✅ |

### DoD → 티켓

| DoD 항목 | 관련 티켓 | 커버 |
|----------|----------|------|
| F1: Morpho APY 표시 | 02, 03, 05 | ✅ |
| F2: StabilityPool "Variable" | 02, 03, 05 | ✅ |
| F3: TVL USD 환산 | 03, 05 | ✅ |
| F4: Total Deposits USD | 05 | ✅ |
| F5: 잔고 초과 에러 | 04 | ✅ |
| F6: share 초과 에러 | 04 | ✅ |
| F7: 비숫자 입력 에러 | 04 | ✅ |
| F8: withdrawAll selector | 04 | ✅ |
| F9: withdraw selector | 04 | ✅ |
| F10: VaultCard Skeleton | 03, 05 | ✅ |
| F11: StatCard Skeleton | 05 | ✅ |
| F12: morphoMath shared 경로 | 01 | ✅ |
| F13: strategyType + morphoMarketId | 01 | ✅ |
| N1: tsc --noEmit | 01~05 각 step | ✅ |
| N2: build 성공 | 05 | ✅ |
| N3: DDD 계층 위반 없음 | 01 | ✅ |
| N4: useYieldVaults 미변경 | 전체 (수정 없음) | ✅ |
| N5: ApyState union | 02 | ✅ |
| E1: APY 조회 실패 → "—" | 02, 03 | ✅ |
| E2: 유동성 0 → 0.00% | 02, 03 | ✅ |
| E3: 지갑 미연결 | 03, 04, 05 | ✅ |
| E4: TVL > 1000 NaN 방지 | 05 | ✅ |
| E5: 빈 입력 | 04 | ✅ |
| E6: 최소 단위 입력 | 04 | ✅ |
| E7: APY 로딩 타이밍 | 02, 03, 05 | ✅ |

### 설계 결정 → 티켓

| 설계 결정 | 관련 티켓 | 커버 |
|----------|----------|------|
| TD-1: morphoMath shared 승격 | 01 | ✅ |
| TD-2: strategyType + morphoMarketId | 01 | ✅ |
| TD-3: ApyState union | 02 | ✅ |
| TD-4: useYieldVaultAPY 훅 | 02 | ✅ |
| TD-5: formatUnits USD 환산 | 05 | ✅ |
| TD-6: VaultCard props 확장 | 03 | ✅ |

## Step 상세
- [Step 01: 설정 확장 + morphoMath 승격](step-01-config-and-math.md)
- [Step 02: useYieldVaultAPY 훅](step-02-apy-hook.md)
- [Step 03: VaultCard 개선](step-03-vault-card.md)
- [Step 04: VaultActionDialog 검증 + withdrawAll](step-04-action-dialog.md)
- [Step 05: page.tsx 통합](step-05-page-integration.md)
