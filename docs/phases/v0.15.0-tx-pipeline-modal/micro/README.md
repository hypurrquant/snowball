# 작업 티켓 - v0.15.0

## 전체 현황

| # | Step | 난이도 | 롤백 | Scope | FP/FN | 개발 | 완료일 |
|---|------|--------|------|-------|-------|------|--------|
| 01 | TxStep 타입 + TxStepItem | 🟢 | ✅ | ✅ | ✅ | ⏳ | - |
| 02 | TxPipelineModal | 🟡 | ✅ | ✅ | ✅ | ⏳ | - |
| 03 | useCreatePosition + DepositPanel 연동 | 🔴 | ✅ | ✅ | ✅ | ⏳ | - |

## 의존성

```
01 (타입 + TxStepItem) → 02 (TxPipelineModal) → 03 (연동)
```

## 커버리지 매트릭스

### PRD 목표 → 티켓

| PRD 목표 | 관련 티켓 | 커버 |
|----------|----------|------|
| 파이프라인 모달 | Step 02 (모달), Step 03 (연동) | ✅ |
| 단계별 상태 시각화 | Step 01 (TxStepItem), Step 03 (상태 관리) | ✅ |
| 완료/에러 피드백 | Step 01 (아이콘/링크), Step 02 (완료/에러 화면), Step 03 (상태 전환) | ✅ |

### DoD → 티켓

| DoD 항목 | 관련 티켓 | 커버 |
|----------|----------|------|
| F1: 모달 열림 + step 리스트 | Step 02, 03 | ✅ |
| F2: 상태 전환 시각화 | Step 01, 03 | ✅ |
| F3: tx 해시 Explorer 링크 | Step 01 | ✅ |
| F4: 성공 메시지 + Close + input 초기화 | Step 02, 03 | ✅ |
| F5: 에러 표시 | Step 01, 02, 03 | ✅ |
| F6: approve 생략 | Step 03 | ✅ |
| F7: 실행 중 닫기 방지 | Step 02 | ✅ |
| N1~N3: tsc/build/lint | Step 03 (최종 확인) | ✅ |
| N4: shared/components/ui 배치 | Step 01, 02 | ✅ |
| N5: shared/types 배치 | Step 01 | ✅ |
| N6: TxState 제거 | Step 03 | ✅ |
| E1: 양쪽 approve 불필요 | Step 03 | ✅ |
| E2: approve reject | Step 03 | ✅ |
| E3: mint 에러 | Step 03 | ✅ |
| E4: out-of-range 한쪽 0 | Step 03 | ✅ |

### 설계 결정 → 티켓

| 설계 결정 | 관련 티켓 | 커버 |
|----------|----------|------|
| Radix Dialog | Step 02 | ✅ |
| TxStep 타입 | Step 01 | ✅ |
| shared 배치 | Step 01, 02 | ✅ |
| lucide-react 아이콘 | Step 01 | ✅ |
| Explorer 링크 | Step 01 | ✅ |
| 실행 중 닫기 방지 | Step 02 | ✅ |

**커버리지: PRD 3/3, DoD 15/15, 설계 6/6 = 100%**

## Step 상세
- [Step 01: TxStep 타입 + TxStepItem](step-01-tx-types-and-step-item.md)
- [Step 02: TxPipelineModal](step-02-tx-pipeline-modal.md)
- [Step 03: useCreatePosition + DepositPanel 연동](step-03-integration.md)
