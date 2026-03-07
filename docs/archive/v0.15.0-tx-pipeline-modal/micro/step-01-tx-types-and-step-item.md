# Step 01: TxStep 타입 + TxStepItem 컴포넌트

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: ✅
- **선행 조건**: 없음

---

## 1. 구현 내용 (design.md 기반)

### 1-1. TxStep 타입 정의 (`shared/types/tx.ts`)
- `TxStepStatus`: 'pending' | 'executing' | 'done' | 'error'
- `TxStepType`: 'approve' | 'mint'
- `TxStep`: { id, type, label, status, txHash?, error? }
- `TxPhase`: 'idle' | 'executing' | 'complete' | 'error'

### 1-2. TxStepItem 컴포넌트 (`shared/components/ui/tx-step-item.tsx`)
- 타임라인 아이콘: pending(회색 원), executing(Loader2 스피너), done(초록 Check), error(빨간 X)
- 타임라인 연결선 (isLast가 아닐 때)
- step.label 표시
- done 시 Explorer tx 링크
- error 시 에러 메시지

## 2. 완료 조건
- [ ] `apps/web/src/shared/types/tx.ts` 파일에 TxStepStatus, TxStepType, TxStep, TxPhase 타입 export
- [ ] `apps/web/src/shared/components/ui/tx-step-item.tsx` 파일에 TxStepItem 컴포넌트 export
- [ ] TxStepItem이 4개 상태(pending/executing/done/error) 모두 렌더링 가능
- [ ] done 상태에서 `EXPLORER_URL/tx/{txHash}` 링크가 target="_blank"로 열림
- [ ] `npx tsc --noEmit` 에러 0

## 3. 롤백 방법
- 신규 파일 2개 삭제

---

## Scope

### 신규 생성 파일
```
apps/web/src/
├── shared/types/tx.ts                    # 신규 - TxStep 관련 타입
└── shared/components/ui/tx-step-item.tsx  # 신규 - 타임라인 아이템 컴포넌트
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| lucide-react | import | Loader2, Check, X, Circle 아이콘 |
| EXPLORER_URL | import | `@/core/config/addresses` |

### Side Effect 위험
- 없음 (신규 파일만 추가, 기존 코드 변경 없음)

### 참고할 기존 패턴
- `HypurrQuant_FE/.../execution/TxProgressItem.tsx`: 타임라인 UI 패턴

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| shared/types/tx.ts | 타입 정의 (1-1) | ✅ OK |
| shared/components/ui/tx-step-item.tsx | UI 컴포넌트 (1-2) | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| 타입 정의 | ✅ tx.ts | OK |
| TxStepItem | ✅ tx-step-item.tsx | OK |

### 검증 통과: ✅

---

-> 다음: [Step 02: TxPipelineModal 컴포넌트](step-02-tx-pipeline-modal.md)
