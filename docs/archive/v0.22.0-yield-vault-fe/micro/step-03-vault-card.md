# Step 03: VaultCard 개선 (APY + USD + Skeleton)

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅
- **선행 조건**: Step 02 (useYieldVaultAPY, ApyState)

---

## 1. 구현 내용 (design.md 기반)

### TD-6: VaultCard props 확장
```typescript
interface VaultCardProps {
  vault: VaultData;
  apyState?: ApyState;  // optional — page.tsx 연결 전에도 tsc 통과
  tvlUsd?: number;
  loading?: boolean;
}
```

### APY 뱃지 표시
- `apyState.kind === "ready"` → `"X.XX%"` 숫자
- `apyState.kind === "variable"` → `"Variable"` 텍스트
- `apyState.kind === "loading"` → Skeleton 애니메이션
- `apyState.kind === "error"` → `"—"` (em dash)
- "Price/Share" 표시를 "Est. APY"로 교체

### TVL USD 환산 병행 표시
- TVL 숫자 옆에 `(~$X.XX)` 형태로 USD 환산 표시
- `tvlUsd` prop 사용

### loading prop 지원
- `loading === true` 시 VaultCard 전체에 Skeleton 표시

## 2. 완료 조건
- [ ] VaultCard에 `apyState?`, `tvlUsd?`, `loading?` props가 추가됨 (모두 optional)
- [ ] `apyState.kind === "ready"` → APY 숫자 표시
- [ ] `apyState.kind === "variable"` → "Variable" 텍스트 표시
- [ ] `apyState.kind === "loading"` 또는 `apyState` 미전달 → APY 영역 Skeleton
- [ ] `apyState.kind === "error"` → `"—"` 표시
- [ ] TVL 옆에 USD 환산이 `(~$X.XX)` 형태로 표시됨 (tvlUsd 전달 시)
- [ ] `loading={true}` 시 VaultCard 전체에 Skeleton 표시
- [ ] "Price/Share" 표시가 "Est. APY"로 교체됨
- [ ] `npx tsc --noEmit` 통과

## 3. 롤백 방법
- `git revert` — VaultCard.tsx 단일 파일 수정

---

## Scope

### 수정 대상 파일
```
apps/web/src/domains/defi/yield/components/VaultCard.tsx  # props 확장, APY/USD/Skeleton 표시
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| VaultCard.tsx | 직접 수정 | props 확장 + 렌더링 로직 변경 |
| page.tsx | 간접 영향 | VaultCard에 새 props를 전달해야 함 (Step 05에서 처리) |

### Side Effect 위험
- page.tsx에서 VaultCard에 새 props를 전달해야 하지만, 이는 Step 05에서 처리
- 새 props(`apyState?`, `tvlUsd?`, `loading?`)는 모두 optional이므로 page.tsx 수정 전에도 tsc 통과

### 참고할 기존 패턴
- `apps/web/src/shared/components/ui/skeleton.tsx`: Skeleton 컴포넌트
- `apps/web/src/shared/components/common/StatCard.tsx`: loading prop 패턴

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| VaultCard.tsx | TD-6 + APY/USD/Skeleton | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| props 확장 | ✅ | OK |
| APY 표시 | ✅ | OK |
| USD 표시 | ✅ | OK |
| Skeleton | ✅ | OK |

### 검증 통과: ✅

---

→ 다음: [Step 04: VaultActionDialog 검증 + withdrawAll](step-04-action-dialog.md)
