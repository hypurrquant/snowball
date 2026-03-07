# Step 02: TxStepType 확장 + useTroveActions adjustTrove approve 분리

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: ✅
- **선행 조건**: 없음 (Step 01과 독립)

---

## 1. 구현 내용 (design.md 기반)
- `shared/types/tx.ts`의 TxStepType에 `"adjustTrove" | "adjustRate"` 추가
- `useTroveActions.ts`의 `adjustTrove` 함수에서 내부 approve 호출(lines 103-105) 제거
- 호출자가 `approveCollateral`을 파이프라인 스텝으로 별도 실행하는 패턴으로 전환

## 2. 완료 조건
- [ ] TxStepType이 `"approve" | "mint" | "openTrove" | "adjustTrove" | "adjustRate"`임
- [ ] `useTroveActions.adjustTrove` 함수 내부에 `approve` 호출이 없음
- [ ] tsc --noEmit 통과

## 3. 롤백 방법
- 롤백 절차: TxStepType에서 추가 타입 제거, adjustTrove에 approve 호출 복원
- 영향 범위: 기존 Adjust 다이얼로그 (Step 04에서 함께 제거되므로 영향 없음)

---

## Scope

### 수정 대상 파일
```
apps/web/src/shared/types/tx.ts                                     # TxStepType 확장
apps/web/src/domains/defi/liquity/hooks/useTroveActions.ts           # adjustTrove에서 approve 제거
```

### 참고할 기존 패턴
- `useTroveActions.openTrove`: approve가 이미 분리된 패턴

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| tx.ts | TxStepType 확장 | ✅ OK |
| useTroveActions.ts | approve 분리 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| TxStepType 추가 | ✅ | OK |
| adjustTrove approve 제거 | ✅ | OK |

### 검증 통과: ✅

---

→ 다음: [Step 03: useEditTrove 훅 생성](step-03-use-edit-trove.md)
