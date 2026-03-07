# 설계 - v0.16.0

## 변경 규모
**규모**: 일반 기능
**근거**: 4개 신규 파일 + 3개 수정 파일, 신규 기능(EditTroveDialog), 내부 API 변경(useTroveActions approve 분리)

---

## 문제 요약
Liquity Borrow에서 기존 Trove를 수정하려면 Adjust(담보/부채)와 Rate(이자율) 다이얼로그를 별도로 사용해야 하며, 둘 다 Position Summary 없이 빈약한 UI. 하나의 "Edit Trove" 다이얼로그로 통합하고 TxPipelineModal 적용.

> 상세: [README.md](README.md) 참조

## 접근법

**Alternative B: 공유 컴포넌트 추출 + useEditTrove 훅**

Open Trove 다이얼로그의 UI 구조(InterestRateSlider, PositionSummary)를 공유 컴포넌트로 추출하고, delta 계산 + 파이프라인 오케스트레이션을 담당하는 `useEditTrove` 훅을 생성. `EditTroveDialog` 컴포넌트가 이 훅을 소비.

## 대안 검토

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: page.tsx 인라인 확장 | 파일 생성 없이 빠르게 구현 | page.tsx 900줄+ 비대화, 코드 중복, 테스트 불가 | - |
| B: 공유 컴포넌트 추출 + useEditTrove 훅 | 관심사 분리, Open/Edit 재사용, useCreatePosition 패턴과 일관 | 신규 파일 4개 | **선택** |
| C: 탭 기반 단일 다이얼로그 | 코드 공유 극대화 | Open/Edit 흐름이 본질적으로 달라 조건분기 복잡 | - |

**선택 이유**: `useCreatePosition` 훅이 DEX에서 확립한 "자기완결형 훅 + 파이프라인 + UI" 패턴과 일관성 유지. page.tsx 150줄 감소.

## 기술 결정

### 1. Delta 계산: 절대값 입력 → 자동 delta

사용자는 **최종 상태**(새 담보 총량, 새 부채 총량)를 입력. 기존 Add/Remove 드롭다운 폐기.

```
collDelta = newColl - existingColl
  > 0 → isCollIncrease=true, collChange=collDelta
  < 0 → isCollIncrease=false, collChange=abs(collDelta)
  = 0 → skip

debtDelta = newDebt - existingDebt (동일 로직)
rateChanged = newRate != existingRate → adjustInterestRate 호출
```

### 2. 파이프라인 스텝 동적 구성

| 변경 내용 | 파이프라인 |
|---|---|
| 담보 증가만 | Approve → Adjust Trove |
| 부채만 변경 | Adjust Trove |
| 이자율만 변경 | Adjust Rate |
| 담보/부채 + 이자율 | Approve (조건부) → Adjust Trove → Adjust Rate |
| 변경 없음 | 버튼 비활성화 |

### 3. useTroveActions 리팩터링

`adjustTrove` 내부의 approve 호출(lines 103-105) 제거. 호출자가 `approveCollateral`을 파이프라인 스텝으로 별도 실행.

### 4. TxStepType 확장

```typescript
export type TxStepType = "approve" | "mint" | "openTrove" | "adjustTrove" | "adjustRate";
```

### 5. Pre-fill & Quick-fill 동작

| 버튼 | Open Trove | Edit Trove |
|---|---|---|
| HALF | walletBalance / 2 | walletBalance / 2 + existingColl |
| MAX | walletBalance | walletBalance + existingColl |
| SAFE | collValueUSD / 2 (200% CR) | newCollValueUSD / 2 (새 coll 기준) |

### 6. Validation

- `newDebt >= MIN_DEBT (10 sbUSD)` 또는 `newDebt == existingDebt` (미변경)
- `preview.isAboveMCR` (새 절대값 기준)
- 담보 증가 시 `(newColl - existingColl) <= walletBalance`
- `hasAnyChange` — 하나라도 변경이 있어야 버튼 활성화

---

## 범위 / 비범위

**범위(In Scope)**:
- InterestRateSlider, PositionSummary 공유 컴포넌트 추출
- useEditTrove 훅 (delta 계산, 파이프라인, validation)
- EditTroveDialog 컴포넌트
- page.tsx에서 기존 Adjust/Rate 다이얼로그 제거 + Edit 버튼 교체
- useTroveActions.adjustTrove approve 분리
- TxStepType 확장

**비범위(Out of Scope)**:
- Close Trove (기존 버튼 그대로 유지)
- Open Trove 다이얼로그 기능 변경 (컴포넌트 import만 변경)
- 온체인 컨트랙트 변경
- Stability Pool UI

## 아키텍처 개요

```
page.tsx
├── Open Trove Dialog (기존, InterestRateSlider/PositionSummary import 변경만)
├── EditTroveDialog ← NEW
│   ├── useEditTrove hook ← NEW (delta 계산 + 파이프라인 오케스트레이션)
│   │   ├── useTroveActions (approve 분리 완료)
│   │   ├── usePositionPreview (기존 재사용)
│   │   ├── useLiquityBranch (기존 재사용)
│   │   ├── useTokenBalance (기존 재사용)
│   │   └── useMarketRateStats (기존 재사용)
│   ├── InterestRateSlider ← EXTRACTED
│   ├── PositionSummary ← EXTRACTED
│   └── TxPipelineModal (기존 재사용)
└── Close Trove (기존 그대로)
```

## 데이터 흐름

```
1. TroveData (id, coll, debt, interestRate)
   ↓ pre-fill
2. useEditTrove state (collAmount, debtAmount, ratePercent)
   ↓ delta 계산
3. { collDelta, isCollIncrease, debtDelta, isDebtIncrease, rateChanged }
   ↓ 파이프라인 구성
4. TxStep[] 동적 생성:
   [Approve?] → [Adjust Trove?] → [Adjust Rate?]
   ↓ 순차 실행
5. approveCollateral() → adjustTrove() → adjustInterestRate()
   ↓ 각 단계 결과
6. TxPipelineModal (pending → executing → done/error)
```

## API/인터페이스 계약

### InterestRateSlider Props
```typescript
{ value: number; onChange: (v: number) => void; avgRate?: number | null }
```

### PositionSummary Props
```typescript
{ preview: PositionPreview; mcrPct: number; ccrPct: number }
```

### EditTroveDialog Props
```typescript
{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trove: TroveData;
  branch: "wCTC" | "lstCTC";
  onSuccess?: () => void;  // refetch 트리거
}
```

### useEditTrove Return
```typescript
{
  // Form state (pre-filled)
  collAmount: string; setCollAmount; debtAmount: string; setDebtAmount;
  ratePercent: number; setRatePercent;
  // Quick-fill
  handleHalf; handleMax; handleSafe;
  // Derived
  preview: PositionPreview;
  hasAnyChange: boolean; errors: string[]; canSubmit: boolean;
  collDelta: { amount: bigint; isIncrease: boolean };
  debtDelta: { amount: bigint; isIncrease: boolean };
  rateChanged: boolean;
  // Pipeline
  txSteps: TxStep[]; txPhase: TxPhase; showTxModal: boolean;
  setShowTxModal: (v: boolean) => void;
  handleEditTrove: () => Promise<void>;
  // Context
  collBalance: bigint | undefined;
  marketStats: { median?: number | null };
  stats: { price: bigint; mcr: bigint; ccr: bigint };
}
```

## 테스트 전략

- **tsc --noEmit**: 타입 에러 없음 확인
- **수동 검증**: Open Trove 동작 불변 확인 (컴포넌트 추출 후)
- **수동 검증**: Edit Trove에서 각 변경 조합 (담보만, 부채만, 이자율만, 전체)의 파이프라인 동작

## 리스크/오픈 이슈

| 리스크 | 대응 |
|---|---|
| adjustTrove approve 제거 시점과 기존 다이얼로그 제거 시점 불일치 | 같은 티켓에서 동시 처리 |
| formatEther(trove.coll) pre-fill 시 소수점 18자리 | `Number(formatEther(val)).toFixed(6)` truncate |
| adjustTrove + adjustInterestRate 2tx 중 첫 번째 성공 후 두 번째 실패 | 에러 모달에 부분 성공 표시, 사용자가 재시도 가능 |
