# Step 02: TxPipelineModal 컴포넌트

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅
- **선행 조건**: Step 01 (TxStep 타입 + TxStepItem)

---

## 1. 구현 내용 (design.md 기반)

### 2-1. TxPipelineModal 컴포넌트 (`shared/components/ui/tx-pipeline-modal.tsx`)
- Radix Dialog 기반 모달
- props: `open, onClose, steps: TxStep[], phase: TxPhase, title?`
- phase별 렌더링:
  - `executing`: TxStepItem 리스트 (타이틀: "Executing Transaction")
  - `complete`: 성공 메시지 + Close 버튼
  - `error`: 에러 메시지 + Close 버튼
- 실행 중(`executing`) backdrop 클릭/ESC 닫기 방지:
  - `onInteractOutside={(e) => e.preventDefault()}`
  - `onEscapeKeyDown={(e) => e.preventDefault()}`

## 2. 완료 조건
- [ ] `apps/web/src/shared/components/ui/tx-pipeline-modal.tsx` 파일에 TxPipelineModal export
- [ ] executing phase: step 리스트 표시, 모달 닫기 불가
- [ ] complete phase: 성공 메시지 + Close 버튼 표시, Close 클릭 시 onClose 호출
- [ ] error phase: 에러 메시지 + Close 버튼 표시
- [ ] `npx tsc --noEmit` 에러 0

## 3. 롤백 방법
- 신규 파일 1개 삭제

---

## Scope

### 신규 생성 파일
```
apps/web/src/
└── shared/components/ui/tx-pipeline-modal.tsx  # 신규 - 파이프라인 모달
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| Dialog (Radix) | import | shared/components/ui/dialog.tsx |
| TxStepItem | import | Step 01에서 생성 |
| TxStep, TxPhase | import | Step 01에서 생성 |
| lucide-react | import | CheckCircle2 (성공), AlertCircle (에러) |

### Side Effect 위험
- 없음 (신규 파일만 추가)

### 참고할 기존 패턴
- `HypurrQuant_FE/.../layout/ExecutionModal.tsx`: 모달 구조
- `HypurrQuant_FE/.../execution/ExecutionFlow.tsx`: phase별 분기

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| tx-pipeline-modal.tsx | 모달 컴포넌트 (2-1) | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| TxPipelineModal | ✅ | OK |

### 검증 통과: ✅

---

-> 다음: [Step 03: useCreatePosition + DepositPanel 연동](step-03-integration.md)
