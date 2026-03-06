# 작업 티켓 - v0.8.0

## 전체 현황

| # | Step | 난이도 | 롤백 | Scope | FP/FN | 개발 | 완료일 |
|---|------|--------|------|-------|-------|------|--------|
| 01 | TOKEN_INFO mockPriceUsd | 🟢 | ✅ | ✅ | ✅ | ⏳ | - |
| 02 | PriceRangeSelector 확장 | 🟠 | ✅ | ✅ | ✅ | ⏳ | - |
| 03 | useCreatePosition 훅 | 🔴 | ✅ | ✅ | ✅ | ⏳ | - |
| 04 | DepositPanel 컴포넌트 | 🟠 | ✅ | ✅ | ✅ | ⏳ | - |
| 05 | page.tsx 2컬럼 통합 | 🟡 | ✅ | ✅ | ✅ | ⏳ | - |

## 의존성

```
01 ──→ 03 ──→ 04 ──→ 05
02 ─────────────────→ 05
```

- Step 01 + 02: 독립 (병렬 가능)
- Step 03: Step 01 필요 (mockPriceUsd)
- Step 04: Step 03 필요 (useCreatePosition 반환값)
- Step 05: Step 02, 03, 04 모두 필요 (통합)

## 파일 변경 요약

| 파일 | 액션 | Step |
|------|------|------|
| `core/config/addresses.ts` | 수정 | 01 |
| `domains/trade/components/PriceRangeSelector.tsx` | 수정 | 02 |
| `domains/trade/hooks/useCreatePosition.ts` | **신규** | 03 |
| `domains/trade/components/DepositPanel.tsx` | **신규** | 04 |
| `app/(trade)/pool/[pair]/page.tsx` | 수정 | 05 |

## 커버리지 매트릭스

### PRD 목표 → 티켓

| PRD 목표 | 관련 티켓 | 커버 |
|----------|----------|------|
| 2컬럼 레이아웃 (KittenSwap 스타일) | Step 05 | ✅ |
| Tick 기반 가격 표시 및 조정 | Step 02 (PriceRangeSelector 확장) | ✅ |
| 유동성 히스토그램 시각화 | Step 02 (줌 컨트롤) | ✅ |
| 프리셋 카드 (Custom 포함) | Step 02 | ✅ |
| 토큰 입력 + Half/Max | Step 03 (로직) + Step 04 (UI) | ✅ |
| USD 환산 | Step 01 (mockPriceUsd) + Step 03 (계산) + Step 04 (표시) | ✅ |
| 토큰 비율 바 | Step 03 (계산) + Step 04 (표시) | ✅ |
| Estimated APR (usePoolList.feesAPR) | Step 03 (매칭) + Step 04 (표시) | ✅ |
| Approve + Mint 트랜잭션 | Step 03 (로직) + Step 04 (버튼 UI) | ✅ |
| 반응형 lg 이상 2컬럼 / 미만 1컬럼 | Step 05 | ✅ |
| HypurrQuant_FE core/dex 구조 활용 | Step 02 (PriceRangeSelector) + Step 03 (calculators.ts/types.ts import) | ✅ |

### DoD → 티켓

| DoD 항목 | 관련 티켓 | 커버 |
|----------|----------|------|
| F1: 2컬럼 레이아웃 렌더링 | Step 05 | ✅ |
| F2: lg 미만 1컬럼 스택 | Step 05 | ✅ |
| F3: 프리셋 5개 카드 렌더링 | Step 02 | ✅ |
| F4: Custom 프리셋 자동 선택 | Step 02 | ✅ |
| F5: 유동성 히스토그램 80개 바 | Step 02 (회귀 확인) | ✅ |
| F6: 현재가 수직선 (yellow) | Step 02 (회귀 확인) | ✅ |
| F7: 드래그 핸들 2개 | Step 02 (회귀 확인) | ✅ |
| F8: MIN/MAX 가격 입력 ±step | Step 02 (회귀 확인) | ✅ |
| F9: CURRENT PRICE 온체인 표시 | Step 02 (회귀 확인) + Step 03 (usePool→currentPrice) + Step 05 (props 전달) | ✅ |
| F10: 줌 컨트롤 (+/-/reset) | Step 02 | ✅ |
| F11: Token0 입력 + Half/Max | Step 03 (로직) + Step 04 (UI) | ✅ |
| F12: Token1 입력 + Half/Max | Step 03 (로직) + Step 04 (UI) | ✅ |
| F13: USD 환산 ~$X.XX | Step 01 + Step 03 + Step 04 | ✅ |
| F14: Total Deposit 합산 | Step 03 (계산) + Step 04 (표시) | ✅ |
| F15: 토큰 비율 바 | Step 03 (계산) + Step 04 (표시) | ✅ |
| F16: Estimated APR feesAPR | Step 03 (매칭) + Step 04 (표시) | ✅ |
| F17: 액션 버튼 상태 머신 | Step 03 (txState) + Step 04 (렌더링) | ✅ |
| F18: Approve → Mint 순차 TX | Step 03 (handleAddLiquidity) | ✅ |
| N1: TypeScript strict 에러 0 | 모든 Step 완료 조건에 tsc 포함 | ✅ |
| N2: DDD 레이어 위반 없음 | Step 05 (page.tsx 최소화 검증) | ✅ |
| N3: 파일 변경 목록 일치 | 파일 변경 요약 vs design.md 일치 | ✅ |
| N4: 기존 /pool 페이지 정상 | Step 05 완료 조건에 포함 | ✅ |
| E1: 존재하지 않는 pool pair | 기존 구현 (usePool 에러 처리) | ✅ |
| E2: 지갑 미연결 상태 | Step 04 (잔고 "—", 버튼 disabled) | ✅ |
| E3: Full Range 프리셋 | 기존 구현 (alignTickToSpacing) | ✅ |
| E4: USDC 6 decimals | Step 03 (parseTokenAmount) | ✅ |
| E5: 금액 0 입력 | Step 04 (Enter Amount disabled) | ✅ |
| E6: tickLower >= tickUpper clamp | 기존 구현 (PriceRangeSelector) | ✅ |

### 설계 결정 → 티켓

| 설계 결정 | 관련 티켓 | 커버 |
|----------|----------|------|
| 대안B: useCreatePosition + DepositPanel 분리 | Step 03 + Step 04 | ✅ |
| tick 검증 = PriceRangeSelector 전담 | Step 02 (기존 유지) | ✅ |
| TOKEN_INFO.mockPriceUsd | Step 01 | ✅ |
| 반응형 1컬럼 스택 | Step 05 | ✅ |
| DDD 4계층 준수 | Step 03 (domains/hooks) + Step 05 (app/ 최소화) | ✅ |
| parseTokenAmount (decimals 대응) | Step 03 | ✅ |
| usePoolList.feesAPR 매칭 | Step 03 | ✅ |
| PriceRangeSelector 확장 (Custom/줌/미니바) | Step 02 | ✅ |
| 토큰 비율 계산 (amount0Usd/totalUsd) | Step 03 (계산) + Step 04 (표시) | ✅ |
| 액션 버튼 상태 머신 | Step 03 (txState) + Step 04 (렌더링) | ✅ |
| 2컬럼 레이아웃 (lg:grid-cols-[1fr_400px]) | Step 05 | ✅ |

## Step 상세
- [Step 01: TOKEN_INFO mockPriceUsd](step-01-mock-price-usd.md)
- [Step 02: PriceRangeSelector 확장](step-02-price-range-selector.md)
- [Step 03: useCreatePosition 훅](step-03-use-create-position.md)
- [Step 04: DepositPanel 컴포넌트](step-04-deposit-panel.md)
- [Step 05: page.tsx 2컬럼 통합](step-05-page-integration.md)
