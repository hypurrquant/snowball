# Liquity Edit Trove UI 통합 - v0.16.0

## 문제 정의

### 현상
- Liquity Borrow 페이지에서 기존 Trove를 관리하려면 **Adjust**, **Rate** 두 개의 별도 다이얼로그를 사용해야 함
- Adjust 다이얼로그: 담보/부채 변경만 가능 (이자율 변경 불가)
- Rate 다이얼로그: 이자율 변경만 가능 (담보/부채 변경 불가)
- 두 다이얼로그 모두 Open Trove 대비 빈약한 UI (슬라이더, Position Summary, HALF/MAX/SAFE 없음)
- 트랜잭션 진행 상태가 보이지 않음 (approve → write 파이프라인 시각화 없음)

### 원인
- 초기 구현 시 컨트랙트 함수 단위로 UI를 분리 (`adjustTrove`, `adjustTroveInterestRate`)
- Open Trove UI가 먼저 고도화되었지만, Adjust/Rate UI는 기본 Input+Button 수준에 머물러 있음
- v0.15.0에서 TxPipelineModal을 만들었으나 Open Trove에만 적용됨

### 영향
- 사용자가 담보 + 이자율을 동시에 변경하려면 두 번의 별도 다이얼로그 조작 필요
- Adjust/Rate에서는 Position Summary(CR, Health Factor, Liquidation Price)를 볼 수 없어 변경의 영향을 사전 확인 불가
- 트랜잭션 진행 중 피드백 부재로 사용자 불안감

### 목표
1. **Adjust + Rate를 하나의 "Edit Trove" 다이얼로그로 통합**
   - Open Trove UI를 재사용 (담보 입력, 부채 입력, 이자율 슬라이더, Position Summary)
   - 현재 Trove 값으로 pre-fill
   - 사용자가 원하는 필드만 수정하여 제출
2. **TxPipelineModal 적용**
   - 변경 내용에 따라 동적 파이프라인 구성:
     - Approve (담보 추가 시)
     - Adjust Trove (담보/부채 변경 시)
     - Adjust Rate (이자율 변경 시)
   - 각 단계별 진행 상태 시각화
3. **기존 Adjust/Rate 버튼 2개를 "Edit" 버튼 1개로 교체**

### 비목표 (Out of Scope)
- Close Trove 기능 변경 (기존 그대로 유지)
- Open Trove 다이얼로그 수정 (이미 v0.15.0에서 완료)
- Stability Pool UI 변경
- 온체인 컨트랙트 변경

## 제약사항
- 온체인에서 `adjustTrove`와 `adjustTroveInterestRate`는 별도 함수 → 담보/부채 + 이자율 동시 변경 시 2tx 필요
- Open Trove에서 사용하는 `usePositionPreview` 훅을 재사용하되, 기존 Trove 값 기반 delta 계산 로직 필요
- `adjustTrove`에서 담보 추가 시 내부적으로 approve를 호출하는 기존 로직 → 외부로 분리 필요 (Open Trove와 동일 패턴)
