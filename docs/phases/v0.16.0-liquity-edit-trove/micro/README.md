# 작업 티켓 - v0.16.0

## 전체 현황

| # | Step | 난이도 | 롤백 | Scope | FP/FN | 개발 | 완료일 |
|---|------|--------|------|-------|-------|------|--------|
| 01 | InterestRateSlider + PositionSummary 추출 | 🟢 | ✅ | ✅ | ✅ | ✅ | 2026-03-07 |
| 02 | TxStepType 확장 + adjustTrove approve 분리 | 🟢 | ✅ | ✅ | ✅ | ✅ | 2026-03-07 |
| 03 | useEditTrove 훅 생성 | 🔴 | ✅ | ✅ | ✅ | ✅ | 2026-03-07 |
| 04 | EditTroveDialog + page.tsx 통합 | 🟠 | ✅ | ✅ | ✅ | ✅ | 2026-03-07 |

## 의존성

```
01 ──┐
     ├──→ 04
02 → 03 ─┘
```

- Step 01, 02: 독립 (병렬 가능)
- Step 03: Step 02에 의존 (TxStepType, adjustTrove approve 분리)
- Step 04: Step 01 + 03에 의존 (추출된 컴포넌트 + useEditTrove)

## 커버리지 매트릭스

### PRD 목표 → 티켓

| PRD 목표 | 관련 티켓 | 커버 |
|----------|----------|------|
| Adjust + Rate → Edit 다이얼로그 통합 | Step 04 | ✅ |
| TxPipelineModal 적용 (동적 파이프라인) | Step 02, 03, 04 | ✅ |
| Adjust/Rate 버튼 → Edit 교체 | Step 04 | ✅ |

### DoD → 티켓

| DoD 항목 | 관련 티켓 | 커버 |
|----------|----------|------|
| F1: InterestRateSlider 추출 | Step 01 | ✅ |
| F2: PositionSummary 추출 | Step 01 | ✅ |
| F3: Edit 버튼 교체 | Step 04 | ✅ |
| F4: 기존 trove 값 pre-fill | Step 03 | ✅ |
| F5: 담보 변경 파이프라인 | Step 03 | ✅ |
| F6: 이자율 변경 파이프라인 | Step 03 | ✅ |
| F7: 전체 변경 3스텝 파이프라인 | Step 03 | ✅ |
| F8: 스텝 상태 전이 표시 | Step 03, 04 | ✅ |
| F9: Explorer 링크 표시 | Step 03 (기존 TxPipelineModal) | ✅ |
| F10: 변경값 반영 | Step 03, 04 | ✅ |
| N1: tsc 통과 | 전체 | ✅ |
| N2: 기존 state/handler 제거 | Step 04 | ✅ |
| N3: adjustTrove approve 제거 | Step 02 | ✅ |
| N4: hasAnyChange 비활성화 | Step 03 | ✅ |
| E1-E5: 엣지케이스 | Step 03 (validation), Step 04 (UI) | ✅ |

### 설계 결정 → 티켓

| 설계 결정 | 관련 티켓 | 커버 |
|----------|----------|------|
| 공유 컴포넌트 추출 | Step 01 | ✅ |
| 절대값 입력 → delta 자동계산 | Step 03 | ✅ |
| 파이프라인 동적 구성 | Step 03 | ✅ |
| useTroveActions approve 분리 | Step 02 | ✅ |
| TxStepType 확장 | Step 02 | ✅ |
| Pre-fill & Quick-fill | Step 03 | ✅ |

## Step 상세
- [Step 01: InterestRateSlider + PositionSummary 추출](step-01-extract-components.md)
- [Step 02: TxStepType 확장 + adjustTrove approve 분리](step-02-hook-refactor.md)
- [Step 03: useEditTrove 훅 생성](step-03-use-edit-trove.md)
- [Step 04: EditTroveDialog + page.tsx 통합](step-04-edit-dialog-integration.md)
