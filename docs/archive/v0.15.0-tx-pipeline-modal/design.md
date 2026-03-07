# 설계 - v0.15.0

## 변경 규모
**규모**: 일반 기능
**근거**: 2개+ 컴포넌트 추가 (TxPipelineModal, TxStepItem), 새 타입 추가, 기존 hook 상태 모델 변경

---

## 문제 요약
Pool New Position의 approve → mint 트랜잭션 과정이 버튼 텍스트로만 표시되어, 사용자가 전체 진행 상황을 파악할 수 없음.

> 상세: [README.md](README.md) 참조

## 접근법
- 기존 `TxState` 문자열을 `TxStep[]` 배열로 확장하여 파이프라인 상태를 표현
- Add Liquidity 버튼 클릭 시 모달을 열고, 타임라인 형태로 각 단계 진행을 표시
- 기존 `handleAddLiquidity` 순차 로직은 유지하되, 상태 업데이트를 step 배열 기반으로 변경
- 공통 UI 컴포넌트는 `shared/components/ui/` 에 배치하여 재사용 가능하게

## 대안 검토

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: 버튼 텍스트만 개선 | 변경 최소 | 파이프라인 전체 상태 불가 | - |
| B: 모달 + step 배열 (UI만) | 시각적 피드백 충분, 기존 로직 최소 변경 | 엔진 없이 상태 관리 수동 | ✅ |
| C: executePipeline 엔진 도입 | 확장성 극대화 | 이번 scope 대비 과도 | - |

**선택 이유**: B는 기존 `handleAddLiquidity`의 try-catch 순차 로직을 유지하면서, 상태 모델만 `TxStep[]`로 확장하고 모달 UI를 추가하는 최소 변경. 엔진(C)은 향후 Swap/Farm 파이프라인 추가 시 도입.

## 기술 결정

| 결정 | 내용 |
|------|------|
| 모달 | 기존 Radix Dialog (`shared/components/ui/dialog.tsx`) 사용 |
| 타입 | `TxStep` (id, type, label, status, txHash?, error?) — shared/types/ |
| 상태 관리 | `useState<TxStep[]>` in useCreatePosition (별도 hook 불필요) |
| 아이콘 | lucide-react (이미 의존): `Loader2`(스피너), `Check`(완료), `X`(에러), `Circle`(pending) |
| Explorer 링크 | `EXPLORER_URL + "/tx/" + txHash` (기존 패턴) |
| 실행 중 닫기 방지 | Radix Dialog의 `onInteractOutside` + `onEscapeKeyDown` preventDefault |

---

## 범위 / 비범위

**범위(In Scope)**:
- `TxStep` 타입 정의
- `TxStepItem` 공통 컴포넌트 (타임라인 아이템)
- `TxPipelineModal` 공통 컴포넌트 (모달 + step 리스트 + 완료/에러 상태)
- `useCreatePosition` 상태 모델 변경 (txState string → txSteps array)
- `DepositPanel` 버튼 → 모달 트리거 연결
- Pool New Position 페이지 연동

**비범위(Out of Scope)**:
- executePipeline 범용 엔진
- Retry/Skip 기능
- Liquity/Morpho 트랜잭션 연동 (별도 Phase)
- 토스트 알림

## 아키텍처 개요

```
shared/components/ui/
├── tx-pipeline-modal.tsx    ← 모달 (Dialog 기반)
└── tx-step-item.tsx         ← 타임라인 아이템

shared/types/
└── tx.ts                    ← TxStep, TxStepStatus, TxStepType

domains/trade/hooks/
└── useCreatePosition.ts     ← txSteps 상태 관리, 모달 open/close

domains/trade/components/
└── DepositPanel.tsx          ← 버튼 클릭 → 모달 open
```

## 데이터 흐름

```
1. 사용자: "Add Liquidity" 클릭
2. DepositPanel → handleAddLiquidity() 호출
3. useCreatePosition:
   a. txSteps 초기화: [approve0(pending), approve1(pending), mint(pending)]
      - needsApproval0=false → approve0 step 제외
      - needsApproval1=false → approve1 step 제외
   b. showTxModal = true
   c. approve0 시작 → txSteps[0].status = 'executing'
   d. approve0 완료 → txSteps[0].status = 'done', txHash 저장
   e. approve1 시작 → txSteps[1].status = 'executing'
   f. approve1 완료 → txSteps[1].status = 'done', txHash 저장
   g. mint 시작 → txSteps[2].status = 'executing'
   h. mint 완료 → txSteps[2].status = 'done', txHash 저장
   i. 모든 step done → phase = 'complete'
   j. 에러 → 해당 step.status = 'error', phase = 'error'
4. TxPipelineModal: txSteps + phase 기반 렌더링
   - executing: TxStepItem 리스트
   - complete: 성공 메시지 + 닫기 버튼
   - error: 에러 메시지 + 닫기 버튼
```

## API/인터페이스 계약

### TxStep 타입

```typescript
// shared/types/tx.ts
export type TxStepStatus = 'pending' | 'executing' | 'done' | 'error';
export type TxStepType = 'approve' | 'mint';

export interface TxStep {
  id: string;
  type: TxStepType;
  label: string;
  status: TxStepStatus;
  txHash?: `0x${string}`;
  error?: string;
}

export type TxPhase = 'idle' | 'executing' | 'complete' | 'error';
```

### TxPipelineModal props

```typescript
interface TxPipelineModalProps {
  open: boolean;
  onClose: () => void;
  steps: TxStep[];
  phase: TxPhase;
  title?: string;
}
```

### TxStepItem props

```typescript
interface TxStepItemProps {
  step: TxStep;
  stepNumber: number;
  isLast: boolean;
}
```

### useCreatePosition 반환값 변경

```typescript
// 제거
txState: TxState;

// 추가
txSteps: TxStep[];
txPhase: TxPhase;
showTxModal: boolean;
setShowTxModal: (open: boolean) => void;
```

### DepositPanel props 변경

```typescript
// 제거
txState: TxState;

// 추가
txSteps: TxStep[];
txPhase: TxPhase;
showTxModal: boolean;
setShowTxModal: (open: boolean) => void;
```

## 테스트 전략
- tsc --noEmit: 타입 체크
- 브라우저 수동 확인: approve → mint 파이프라인 모달 동작
- 엣지: approve 불필요 시 step 생략, 에러 시 에러 표시, 실행 중 모달 닫기 방지

## 리스크/오픈 이슈
- **approve 상태 판단 타이밍**: `needsApproval`이 handleAddLiquidity 호출 시점에 결정되므로, step 배열 초기화 시점에 확정 가능
- **기존 TxState 하위호환**: `isPending` 같은 기존 파생값이 DepositPanel에서 사용됨 → `txPhase`로 대체 필요
