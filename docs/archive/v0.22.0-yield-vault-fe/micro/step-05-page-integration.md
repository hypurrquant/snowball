# Step 05: page.tsx 통합 (StatCard + VaultCard 연결)

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅
- **선행 조건**: Step 02 (useYieldVaultAPY), Step 03 (VaultCard props)

---

## 1. 구현 내용 (design.md 기반)

### useYieldVaultAPY 훅 호출
- page.tsx에서 `useYieldVaultAPY()` 호출하여 APY 데이터 획득
- VaultCard에 `apyState` prop 전달

### TD-5: USD 환산 통합
- `formatUnits(vault.tvl, 18)` → `Number()` → `× TOKEN_INFO[vault.want].mockPriceUsd` → tvlUsd
- 각 VaultCard에 `tvlUsd` prop 전달
- Total Deposits StatCard: USD 합산 (`formatUSD(totalTvlUsd)`)

### StatCard 개선
- "Total Deposits (Raw)" → "Total Deposits" (USD 표시)
- "Avg Price/Share" → "Best APY" 또는 유의미한 지표로 교체
- 3개 StatCard에 `loading={isLoading}` prop 전달 ("..." 텍스트 대신 Skeleton)

### VaultCard에 loading prop 전달
- `isLoading` 상태를 VaultCard에 전달

## 2. 완료 조건
- [ ] page.tsx에서 `useYieldVaultAPY()` 호출 + VaultCard에 `apyState` 전달
- [ ] Total Deposits StatCard가 USD 합산 표시 (예: "$1,234.56")
- [ ] StatCard 3개에 `loading` prop 전달, 로딩 시 Skeleton 표시
- [ ] VaultCard에 `tvlUsd`, `loading` props 전달
- [ ] 이종 토큰(wCTC $5, sbUSD $1, USDC $1) 합산이 올바름
- [ ] vault data와 APY 로딩 타이밍 차이 시: vault 데이터 먼저 표시 + APY 영역만 Skeleton 유지 → APY 도착 시 값 전환 (E7)
- [ ] `npx tsc --noEmit` 통과
- [ ] `npm run build` 통과

## 3. 롤백 방법
- `git revert` — page.tsx 단일 파일 수정

---

## Scope

### 수정 대상 파일
```
apps/web/src/app/(defi)/yield/page.tsx  # 훅 호출 + StatCard/VaultCard에 새 props 전달
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| page.tsx | 직접 수정 | useYieldVaultAPY 호출, USD 환산, StatCard/VaultCard props 연결 |
| useYieldVaultAPY | import 사용 | Step 02에서 생성 |
| VaultCard | props 전달 | Step 03에서 확장한 props 사용 |
| TOKEN_INFO | import 사용 | addresses.ts에서 mockPriceUsd |
| formatUnits | import 사용 | viem에서 import |
| formatUSD | import 사용 | shared/lib/utils.ts |

### Side Effect 위험
- 없음. page.tsx만 수정하며 기존 useYieldVaults 호출은 유지.

### 참고할 기존 패턴
- `apps/web/src/domains/defi/trade/hooks/useCreatePosition.ts`: TOKEN_INFO.mockPriceUsd 사용 패턴

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| page.tsx | 훅 연결 + USD + StatCard + VaultCard | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| useYieldVaultAPY 호출 | ✅ | OK |
| USD 환산 계산 | ✅ | OK |
| StatCard loading | ✅ | OK |
| VaultCard props 전달 | ✅ | OK |
| Total Deposits USD | ✅ | OK |

### 검증 통과: ✅

---

→ 완료: 모든 Step 개발 완료 후 DoD 최종 검증
