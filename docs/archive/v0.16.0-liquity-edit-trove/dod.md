# DoD (Definition of Done) - v0.16.0

## 기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | InterestRateSlider가 별도 컴포넌트로 추출되고, Open Trove 다이얼로그에서 동일하게 동작함 | 수동: /liquity/borrow에서 Open Trove 다이얼로그의 이자율 슬라이더 동작 확인 |
| F2 | PositionSummary가 별도 컴포넌트로 추출되고, Open Trove 다이얼로그에서 동일하게 동작함 | 수동: Open Trove에서 담보/부채 입력 시 Position Summary(CR, HF, Liquidation Price) 표시 확인 |
| F3 | 기존 Adjust/Rate 버튼 2개가 "Edit" 버튼 1개로 교체됨 | 수동: Trove 카드에 Edit 버튼 1개만 존재, Adjust/Rate 버튼 없음 |
| F4 | Edit Trove 다이얼로그가 기존 trove 값(담보, 부채, 이자율)으로 pre-fill됨 | 수동: Edit 클릭 시 현재 trove의 coll/debt/rate가 입력 필드에 표시 |
| F5 | 담보만 변경 시 Approve(조건부) → Adjust Trove 파이프라인이 TxPipelineModal에 표시됨 | 수동: 담보만 증가 → 모달에 Approve + Adjust Trove 스텝 표시 |
| F6 | 이자율만 변경 시 Adjust Rate 단일 스텝 파이프라인이 표시됨 | 수동: 이자율만 변경 → 모달에 Adjust Rate 스텝만 표시 |
| F7 | 담보/부채 + 이자율 동시 변경 시 최대 3스텝(Approve → Adjust Trove → Adjust Rate) 파이프라인 표시 | 수동: 전체 변경 → 모달에 해당 스텝들 표시 |
| F8 | 각 파이프라인 스텝이 pending → executing → done 상태 전이를 보여줌 | 수동: 실행 중 스텝별 아이콘/상태 변화 확인 |
| F9 | 완료된 스텝에 Explorer 링크가 표시됨 | 수동: done 상태 스텝에 "View transaction" 링크 확인 |
| F10 | Edit 성공 후 Trove 카드에 변경된 값이 반영됨 | 수동: Edit 완료 → 카드의 Collateral/Debt/Rate 값 변경 확인 |

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | TypeScript strict 에러 0 (기존 무관 에러 제외) | `tsc --noEmit` |
| N2 | page.tsx에서 기존 Adjust/Rate 관련 state 및 핸들러 완전 제거 | Grep: `adjustTroveId\|rateTroveId\|handleAdjustTrove\|handleAdjustRate` → 0 hits |
| N3 | useTroveActions.adjustTrove에서 내부 approve 호출 제거됨 | 코드 확인: adjustTrove 함수 내에 `approve` 호출 없음 |
| N4 | 변경 없을 때(hasAnyChange=false) 버튼 비활성화 | 수동: Edit 다이얼로그에서 아무것도 변경하지 않으면 버튼 disabled |

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | 담보를 현재 잔액보다 많이 입력 | 에러 메시지 표시 + 버튼 비활성화 | 수동: 잔액 초과 입력 시 확인 |
| E2 | 부채를 MIN_DEBT(10 sbUSD) 미만으로 줄임 | 에러 메시지 표시 + 버튼 비활성화 | 수동: debt를 5로 변경 시 확인 |
| E3 | 변경 결과 CR이 MCR 미만 | 에러 메시지 표시 + 버튼 비활성화 | 수동: 담보 대폭 감소 또는 부채 대폭 증가 시 확인 |
| E4 | adjustTrove 성공 후 adjustInterestRate 실패 (2tx 중 부분 성공) | 에러 모달에 1번 스텝 done + 2번 스텝 error 표시 | 수동: 네트워크 에러 시뮬레이션 또는 코드 리뷰 확인 |
| E5 | 담보 감소만 (approve 불필요) | Approve 스텝 없이 Adjust Trove만 파이프라인에 표시 | 수동: 담보 감소 → 모달에 Adjust Trove만 표시 |

## PRD 목표 ↔ DoD 매핑

| PRD 목표 | DoD 항목 |
|----------|---------|
| Adjust + Rate를 하나의 Edit 다이얼로그로 통합 | F3, F4 |
| TxPipelineModal 적용 (동적 파이프라인) | F5, F6, F7, F8, F9 |
| 기존 Adjust/Rate 버튼 제거 → Edit 교체 | F3, N2 |

## 설계 결정 ↔ DoD 매핑

| 설계 결정 | DoD 항목 |
|----------|---------|
| 공유 컴포넌트 추출 (InterestRateSlider, PositionSummary) | F1, F2 |
| 절대값 입력 → delta 자동계산 | F4, E5 |
| 파이프라인 스텝 동적 구성 | F5, F6, F7 |
| useTroveActions approve 분리 | N3 |
| TxStepType 확장 | N1 (tsc 통과) |
