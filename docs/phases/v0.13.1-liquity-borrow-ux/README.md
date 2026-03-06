# Liquity Borrow UX 복원 + 온체인 데이터 연동 - v0.13.1

## 문제 정의

### 현상
- Liquity Borrow 페이지(`/liquity/borrow`)에서 Interest Rate를 텍스트 Input으로만 입력
- Redemption 리스크 시각화 없음 (이율 낮을수록 먼저 리딤되는데 사용자가 알 수 없음)
- Position Summary(CR 미리보기, Liquidation Price, Upfront Fee) 없음
- HALF / MAX / SAFE 빠른 입력 버튼 없음
- 시장 평균 이율 참고 정보 없음

### 원인
- v0.5.0 DDD 리팩토링 시 1기 레거시 UI(`snowball-app/Borrow.tsx`)의 풍부한 UX를 가져오지 않고 최소 기능만 구현
- 1기 코드는 하드코딩 값(시장 평균 6.5%, MCR 110/120 등)을 사용했으나, 현재는 온체인 컨트랙트가 배포/운영 중이므로 실제 데이터 사용 가능

### 영향
- 사용자가 적절한 이율을 판단할 수 없어 redemption 리스크에 노출
- Position 오픈 전 안전성(CR, Liquidation Price) 확인 불가
- UX 품질이 경쟁 DeFi 프로토콜 대비 크게 떨어짐

### 목표
1. 1기 Borrow.tsx의 UX 요소를 현재 DDD 구조로 복원
2. 하드코딩 값을 온체인 실제 데이터로 교체
3. Interest Rate 슬라이더 + Redemption 리스크 시각화 구현
4. Position Summary (CR, Liquidation Price, Upfront Fee, Annual Cost) 실시간 계산
5. HALF / MAX / SAFE 빠른 입력 버튼

### 비목표 (Out of Scope)
- Agent 자동 관리 토글 (v0.12.0 Agent 페이즈에서 별도 처리)
- Trove 목록/Adjust/Close UI 변경 (현재 잘 동작함)
- Stability Pool(Earn) 페이지 개선
- 모바일 반응형 최적화

## 제약사항
- 기존 DDD 4계층 구조 유지 (core/domains/shared/app)
- 온체인 호출 최소화 (useReadContracts 배치 사용)
- 기존 useLiquityBranch, useTroveActions, useAllTroves 훅 활용/확장
