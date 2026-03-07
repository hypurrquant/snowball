# Transaction Pipeline Modal - v0.15.0

## 문제 정의

### 현상
- Pool New Position에서 Add Liquidity 시 approve0 → approve1 → mint 3단계가 순차 실행되지만, 사용자에게 현재 진행 상황이 보이지 않음
- 버튼 텍스트만 "Approving Token0..." → "Approving Token1..." → "Adding..." 으로 바뀔 뿐, 전체 파이프라인의 어디까지 완료되었는지 알 수 없음
- 에러 발생 시 어느 단계에서 실패했는지 불명확하고, 재시도 UX가 없음

### 원인
- 현재 `txState`가 단순 문자열("idle" | "approving0" | "approving1" | "minting" | "success" | "error")로, 파이프라인 전체 상태를 표현하지 못함
- 트랜잭션 진행 중 모달 같은 전용 UI가 없어서 버튼 하나에 모든 상태를 압축 표시

### 영향
- 사용자가 "지금 뭘 기다리는 건지" 모름 → MetaMask 팝업이 떴는지, 온체인 컨펌 중인지 불분명
- approve가 이미 완료됐는데 에러 발생 시 처음부터 다시 해야 하는지 혼란
- DeFi UX 기본 기대치(파이프라인 진행 표시) 미충족

### 목표
1. **트랜잭션 파이프라인 모달**: approve → mint 과정을 타임라인 형태의 모달로 표시
2. **단계별 상태 시각화**: pending → executing(스피너) → done(체크) → error(X) 상태 아이콘
3. **완료/에러 피드백**: 성공 시 tx 해시 링크, 실패 시 에러 메시지 표시

### 비목표 (Out of Scope)
- **파이프라인 엔진**: `executePipeline` 같은 범용 실행 엔진은 이번에 만들지 않음 (기존 `handleAddLiquidity`의 순차 로직 유지)
- **Retry/Skip**: 에러 시 재시도/건너뛰기 기능은 포함하지 않음 (v0.16.0+)
- **Swap 단계**: Zap Mint 같은 swap → mint 파이프라인은 범위 밖
- **Farm 단계**: 민팅 후 자동 스테이킹은 범위 밖
- **RecoveryPanel**: 고급 복구 옵션 UI는 범위 밖

## 제약사항
- 기존 `useCreatePosition` hook의 `handleAddLiquidity` 순차 로직을 유지하되, 상태 모델만 확장
- 공통 UI 컴포넌트는 `shared/` 레이어에 배치하여 다른 도메인(Liquity, Morpho 등)에서도 재사용 가능하게
- HypurrQuant_FE의 `TxProgressItem` 패턴을 참조하되, Snowball의 디자인 시스템(ice-400, bg-input 등)에 맞게 적용

## 향후 확장 참고 (엔진 설계 메모)

> 이번 Phase에서는 **UI만** 구현하지만, 향후 `executePipeline` 엔진 도입 시의 구조를 기록해둔다.

### 엔진 구조 (v0.16.0+ 후보)

```
packages/core/dex/pipeline/
├── types.ts           # PipelineStage, ExecutionStep, SharedContext
├── executePipeline.ts # stage[] 순회 → buildTx → executeTx → callbacks
└── executeOperation.ts # 단일 operation 실행 (atomic step 단위)
```

### 데이터 흐름 (엔진 도입 시)

```
useExecutionOrchestration
  → stages 선언 [approve0?, approve1?, mint]
  → executePipeline(stages, deps, callbacks)
    → 각 stage.builder.steps 순회
      → callbacks.onStepStart → UI 업데이트
      → buildTx() → executeTx() → callbacks.onStepComplete
    → callbacks.onComplete → 최종 UI
```

### 핵심 타입 (참고)

```typescript
type ExecutionStepStatus = 'pending' | 'executing' | 'done' | 'error' | 'skipped';
type ExecutionPhase = 'idle' | 'executing' | 'complete' | 'error';

interface ExecutionStep {
  id: string;
  type: 'approve' | 'mint';
  label: string;
  status: ExecutionStepStatus;
  txHash?: string;
  error?: string;
}
```

이번 Phase에서는 이 타입과 UI 컴포넌트만 구현하고, `executePipeline` 엔진은 만들지 않는다.
