# Step 05: page.tsx 2컬럼 레이아웃 통합

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅
- **선행 조건**: Step 02, 03, 04 (모든 컴포넌트/훅 준비 완료)

---

## 1. 구현 내용 (design.md 기반)

page.tsx를 2컬럼 레이아웃 셸로 리라이팅한다. 기존 상태/로직은 모두 useCreatePosition으로 이동 완료된 상태.

### 1-1. 레이아웃 구조
```tsx
<div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
  <SelectRangePanel />   {/* 왼쪽: PriceRangeSelector */}
  <DepositPanel />        {/* 오른쪽 */}
</div>
```

### 1-2. page.tsx 책임 (최소화)
- URL params에서 token0, token1 파싱
- `useCreatePosition(token0, token1)` 호출
- PriceRangeSelector에 range 관련 props 전달
- DepositPanel에 deposit 관련 props 전달
- 페이지 헤더 (Back 링크 + pair 타이틀)

### 1-3. 기존 로직 제거
- useState (amount0Str, amount1Str 등) → useCreatePosition으로 이동 완료
- handleMint → useCreatePosition.handleAddLiquidity로 교체
- useTokenBalance 직접 호출 → useCreatePosition 내부로 이동
- approve 로직 → useCreatePosition 내부로 이동

### 1-4. 반응형
- lg 이상: 2컬럼 (1fr + 400px)
- lg 미만: 1컬럼 세로 스택 (SelectRange → Deposit)

### 1-5. DDD 레이어 준수
- page.tsx에 useState, useMemo, 계산식 없음
- useCreatePosition 호출 + 컴포넌트 배치만 수행

## 2. 완료 조건
- [ ] 2컬럼 레이아웃: 1280px 이상에서 좌(PriceRangeSelector) + 우(DepositPanel) 렌더링
- [ ] 1컬럼 스택: 768px 리사이즈 시 세로 스택 (SelectRange → Deposit 순서)
- [ ] page.tsx에 useState, useMemo, 계산식 없음 (useCreatePosition 호출 + 컴포넌트 배치만)
- [ ] 기존 pool list 페이지(`/pool`) 정상 동작 유지
- [ ] Back 링크 `/pool` 동작
- [ ] `npx tsc --noEmit` 기존 에러(PriceChart.tsx:99) 외 신규 에러 0
- [ ] `grep -r "from 'react'" apps/web/src/core/dex/` 결과 0건

## 3. 롤백 방법
- `git checkout -- apps/web/src/app/(trade)/pool/[pair]/page.tsx`
- 영향 범위: page.tsx 1개 파일. 롤백 시 기존 인라인 로직으로 복원.

---

## Scope

### 수정 대상 파일
```
apps/web/src/app/(trade)/pool/[pair]/page.tsx  # 수정 - 2컬럼 셸로 리라이팅
```

### 신규 생성 파일
없음

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| useCreatePosition (Step 03) | import | 훅 호출 |
| PriceRangeSelector (Step 02) | import | 왼쪽 패널 |
| DepositPanel (Step 04) | import | 오른쪽 패널 |
| useConnection | import | isConnected (DepositPanel에 전달) |
| TOKEN_INFO | import | 토큰 심볼/decimals 조회 (pair 파싱) |

### Side Effect 위험
- **기존 /pool 페이지 회귀 위험**: pool/[pair]/page.tsx만 수정하므로 pool/page.tsx에 영향 없음
- **기존 pool/add/page.tsx**: 별도 파일이므로 영향 없음

### 참고할 기존 패턴
- `apps/web/src/app/(trade)/pool/[pair]/page.tsx`: 현재 구현 (리라이팅 대상)

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| page.tsx | 2컬럼 통합 리라이팅 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| 2컬럼 grid 레이아웃 | ✅ page.tsx | OK |
| useCreatePosition 호출 | ✅ page.tsx | OK |
| PriceRangeSelector 배치 | ✅ page.tsx | OK |
| DepositPanel 배치 | ✅ page.tsx | OK |
| 반응형 1컬럼 폴백 | ✅ page.tsx (grid-cols-1 lg:grid-cols-[1fr_400px]) | OK |
| 기존 상태 로직 제거 | ✅ page.tsx | OK |

### 검증 체크리스트
- [x] Scope의 모든 파일이 구현 내용과 연결됨
- [x] 구현 내용의 모든 항목이 Scope에 반영됨
- [x] 불필요한 파일(FP)이 제거됨
- [x] 누락된 파일(FN)이 추가됨

### 검증 통과: ✅
