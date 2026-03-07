# Step 03: useCreatePosition + DepositPanel + Page 연동

## 메타데이터
- **난이도**: 🔴 어려움
- **롤백 가능**: ✅ (git revert)
- **선행 조건**: Step 01, Step 02

---

## 1. 구현 내용 (design.md 기반)

### 3-1. useCreatePosition 상태 모델 변경
- `TxState` 타입 제거 → `TxStep[]` + `TxPhase` 사용
- `txState: TxState` → `txSteps: TxStep[]` + `txPhase: TxPhase`
- `showTxModal` + `setShowTxModal` 상태 추가
- `handleAddLiquidity` 내부 로직 변경:
  1. step 배열 초기화 (needsApproval 기반으로 approve step 포함/제외)
  2. `showTxModal = true`
  3. 각 단계 시작/완료/에러 시 해당 step의 status 업데이트
  4. txHash 저장
  5. 모든 step 완료 → `txPhase = 'complete'`
  6. 에러 → `txPhase = 'error'`, 해당 step.error 저장

### 3-2. DepositPanel props 변경
- `txState: TxState` 제거
- `txSteps: TxStep[]`, `txPhase: TxPhase`, `showTxModal: boolean`, `setShowTxModal` 추가
- `isPending` 파생값을 `txPhase === 'executing'`으로 변경
- ActionButton의 label/disabled 로직 `txPhase` 기반으로 변경
- TxPipelineModal 렌더링 추가

### 3-3. Pool [pair] page.tsx props 전달 변경
- `txState` → `txSteps`, `txPhase`, `showTxModal`, `setShowTxModal`

## 2. 완료 조건
- [ ] `TxState` 타입이 useCreatePosition.ts에서 제거됨
- [ ] `txSteps: TxStep[]`, `txPhase: TxPhase`, `showTxModal`, `setShowTxModal`이 반환값에 포함
- [ ] Add Liquidity 클릭 시 모달이 열리고 step 리스트 표시
- [ ] approve 불필요 시 해당 step이 생략됨
- [ ] 각 step의 상태가 pending → executing → done 순서로 전환
- [ ] 에러 시 해당 step이 error 상태, txPhase가 'error'
- [ ] 완료 시 txPhase가 'complete', Close 클릭 시 input 초기화
- [ ] 실행 중 모달 닫기 불가
- [ ] `npx tsc --noEmit` 에러 0
- [ ] `npm run build` 성공
- [ ] `npm run lint` 에러 0

## 3. 롤백 방법
- git revert (3개 파일 수정)

---

## Scope

### 수정 대상 파일
```
apps/web/src/
├── domains/trade/hooks/useCreatePosition.ts  # 수정 - txState → txSteps/txPhase, handleAddLiquidity 변경
├── domains/trade/components/DepositPanel.tsx  # 수정 - props 변경, TxPipelineModal 추가
└── app/(trade)/pool/[pair]/page.tsx           # 수정 - props 전달 변경
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| useCreatePosition | 직접 수정 | 상태 모델 변경, 반환값 변경 |
| DepositPanel | 직접 수정 | props 인터페이스 변경, 모달 추가 |
| page.tsx | 직접 수정 | props 전달 변경 |
| TxPipelineModal | import 추가 | Step 02에서 생성 |
| TxStep, TxPhase | import 추가 | Step 01에서 생성 |

### Side Effect 위험
- **TxState 제거**: DepositPanel에서 `import type { TxState }`를 사용 중 → 완전 제거 필요
- **ActionButton isPending 로직**: 기존 `txState === "approving0" || ...` → `txPhase === 'executing'`으로 일괄 변경

### 참고할 기존 패턴
- 현재 `handleAddLiquidity`의 try-catch 순차 로직을 유지하되 상태 업데이트만 변경

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| useCreatePosition.ts | 상태 모델 변경 (3-1) | ✅ OK |
| DepositPanel.tsx | props + 모달 (3-2) | ✅ OK |
| page.tsx | props 전달 (3-3) | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| 상태 모델 변경 | ✅ useCreatePosition.ts | OK |
| DepositPanel props | ✅ DepositPanel.tsx | OK |
| page props | ✅ page.tsx | OK |

### 검증 통과: ✅
