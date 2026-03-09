# Step 04: Trade + Pool Add Page (Sprint 4)

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅ (파일 이동/추출 복구)
- **선행 조건**: Step 01 (formatUsdCompact 사용)

---

## 1. 구현 내용 (design.md 기반)

### 4-1. Tick bitmap/helper 추출 → `trade/lib/tickUtils.ts`
- `usePoolTicks.ts`에서 `computeWordPositions`, `extractInitializedTicks`, `buildEmptyTicks` 추출
- `TICK_BITMAP_ABI`, `TICKS_ABI`, `TICK_RANGE` 상수도 lib으로

### 4-2. Protocol stats fetcher/formatter 추출 → `trade/lib/statsApi.ts`
- `useProtocolStats.ts`에서 `fetchStats`, `ProtocolStats` interface, `MOCK_DATA` 추출
- hook은 thin wrapper

### 4-3. Pool list 순수 로직 추출 → `trade/lib/poolListMapper.ts`
- `usePoolList.ts`에서 `getTokenIcon`, `apiToPoolListItem`, `formatPercent`, `MOCK_POOLS` 추출

### 4-4. TokenSelector 이동: shared → trade
- `shared/components/common/TokenSelector.tsx` → `domains/trade/components/TokenSelector.tsx`
- `app/(trade)/swap/page.tsx`의 import 경로 변경

### 4-5. Trade 매직 넘버 상수화
- `DEFAULT_FEE_TIER`, `DEFAULT_SLIPPAGE_BPS`, `DEFAULT_DEADLINE_SECONDS`, `RANGE_PRESETS`
- `trade/lib/constants.ts` 생성
- 소비처 교체:
  - `hooks/useSwap.ts` — fee=3000, slippageBps=50
  - `hooks/usePool.ts` — fee tier
  - `hooks/useAddLiquidity.ts` — slippage, deadline
  - `components/PriceRangeSelector.tsx` — range preset 값

### 4-6. Pool Add page 상수 정리
- `pool/add/page.tsx`의 인라인 매직넘버(`= 3000`, `= 50`, `= 600`)를 constants import로 교체

## 2. 완료 조건
- [ ] `grep "computeWordPositions\|extractInitializedTicks\|buildEmptyTicks" apps/web/src/domains/trade/lib/tickUtils.ts` — 3건
- [ ] `grep "fetchStats\|ProtocolStats" apps/web/src/domains/trade/lib/statsApi.ts` — 2건
- [ ] `ls apps/web/src/domains/trade/lib/poolListMapper.ts` — 파일 존재
- [ ] `ls apps/web/src/domains/trade/components/TokenSelector.tsx` — 파일 존재
- [ ] `grep -c "export" apps/web/src/domains/trade/lib/constants.ts` ≥ 3
- [ ] `grep -c "= 3000\|= 50\|= 600" apps/web/src/app/\(trade\)/pool/add/page.tsx` — 0건
- [ ] `grep -l "from.*lib/" apps/web/src/domains/trade/hooks/usePoolTicks.ts apps/web/src/domains/trade/hooks/useProtocolStats.ts` — 2개 파일 모두 매칭
- [ ] `grep -l "from.*lib/constants" apps/web/src/domains/trade/hooks/useSwap.ts apps/web/src/domains/trade/hooks/usePool.ts apps/web/src/domains/trade/hooks/useAddLiquidity.ts apps/web/src/domains/trade/components/PriceRangeSelector.tsx` — 4개 파일 모두 매칭 (매직넘버 소비처 교체 확인)
- [ ] `cd apps/web && npx next build` — exit code 0
- [ ] Swap/Pool 페이지 수동 접속 → 정상 렌더링 + 수치 표시 확인 (N3, E2)

## 3. 롤백 방법
- `git revert` 가능. 새 lib 파일 삭제, TokenSelector 복구, page 원복
- 영향 범위: trade 도메인 + pool/add page + swap page (import 경로만)

---

## Scope

### 수정 대상 파일
```
apps/web/src/domains/trade/
├── hooks/usePoolTicks.ts           # 수정 - 순수 로직 제거, lib import
├── hooks/useProtocolStats.ts       # 수정 - thin wrapper
├── hooks/usePoolList.ts            # 수정 - mapper 추출
├── hooks/useSwap.ts                # 수정 - fee/slippage 매직넘버 → constants import
├── hooks/usePool.ts                # 수정 - fee tier → constants import
├── hooks/useAddLiquidity.ts        # 수정 - slippage/deadline → constants import
└── components/PriceRangeSelector.tsx  # 수정 - range preset → constants import

apps/web/src/app/(trade)/
├── swap/page.tsx                   # 수정 - TokenSelector import 경로
└── pool/add/page.tsx               # 수정 - 매직넘버 → constants import

apps/web/src/shared/components/common/
└── TokenSelector.tsx               # 이동 → trade/components/
```

### 신규 생성 파일
```
apps/web/src/domains/trade/
├── lib/tickUtils.ts                # 신규 - tick 순수 로직
├── lib/statsApi.ts                 # 신규 - stats fetcher/formatter
├── lib/poolListMapper.ts           # 신규 - pool list 변환
├── lib/constants.ts                # 신규 - DEFAULT_FEE_TIER, DEFAULT_SLIPPAGE_BPS 등
└── components/TokenSelector.tsx    # 이동 - shared에서 이동
```

### Side Effect 위험
- TokenSelector 이동 후 다른 도메인에서 필요해질 수 있음 → 현재 1곳만 사용, 필요시 shared로 복귀
- TICK_BITMAP_ABI를 lib으로 옮기면 hook에서 동적 contract 구성 복잡해질 수 있음 → ABI는 lib, contract 구성은 hook에 유지

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| usePoolTicks.ts | 4-1 tick 추출 | ✅ OK |
| useProtocolStats.ts | 4-2 stats 추출 | ✅ OK |
| usePoolList.ts | 4-3 mapper 추출 | ✅ OK |
| useSwap.ts | 4-5 매직넘버 소비처 | ✅ OK |
| usePool.ts | 4-5 매직넘버 소비처 | ✅ OK |
| useAddLiquidity.ts | 4-5 매직넘버 소비처 | ✅ OK |
| PriceRangeSelector.tsx | 4-5 매직넘버 소비처 | ✅ OK |
| TokenSelector.tsx | 4-4 이동 | ✅ OK |
| swap/page.tsx | 4-4 import 변경 | ✅ OK |
| pool/add/page.tsx | 4-6 상수 교체 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| tick 추출 | ✅ | OK |
| stats 추출 | ✅ | OK |
| pool list mapper | ✅ | OK |
| TokenSelector 이동 | ✅ | OK |
| 상수 생성 | ✅ | OK |
| 상수 소비처 교체 (useSwap, usePool, useAddLiquidity, PriceRangeSelector) | ✅ | OK |
| page 상수 교체 | ✅ | OK |

### 검증 통과: ✅

---

> 다음: [Step 05: Morpho + Yield + Agent](step-05-morpho-yield-agent.md)
