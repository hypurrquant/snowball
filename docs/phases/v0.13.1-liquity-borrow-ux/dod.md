# v0.13.1 DoD - Liquity Borrow UX

## 기능 요건

### F-1: Interest Rate 슬라이더
- [ ] Radix UI Slider로 0.5%~25% 범위 조절 가능
- [ ] 컬러 그라데이션 배경 (빨강→노랑→초록)
- [ ] 시장 평균(중앙값) 마커 표시
- [ ] "Higher/Lower redemption risk" 라벨
- [ ] 연간 이자 비용 실시간 표시
- 검증: 슬라이더 조작 시 값이 반영되고, openTrove 호출 시 정확한 rate 전달

### F-2: Position Summary
- [ ] Health Factor (CR) 색상 코딩 (초록 ≥200%, 노랑 ≥150%, 빨강 <150%)
- [ ] Liquidation Price 실시간 계산
- [ ] 7-day Upfront Fee 계산
- [ ] Annual Interest Cost 계산
- [ ] MCR / CCR 온체인 값 표시
- 검증: collateral/debt/rate 변경 시 모든 값이 즉시 재계산

### F-3: 빠른 입력 버튼
- [ ] HALF: 잔액의 50% 자동 입력
- [ ] MAX: 잔액 전체 자동 입력
- [ ] SAFE: 200% CR 목표 debt 자동 계산
- 검증: 각 버튼 클릭 시 정확한 값이 Input에 반영

### F-4: 시장 이율 통계
- [ ] useAllTroves 데이터에서 중앙값/평균 계산
- [ ] 슬라이더 위 마커로 표시
- 검증: 온체인 Trove 데이터와 일치하는 통계값

## 비기능 요건

### NF-1: 성능
- 온체인 호출은 기존 useLiquityBranch + useAllTroves 재사용 (추가 RPC 호출 없음)
- Position 계산은 순수 프론트 연산 (useMemo)

### NF-2: 구조
- DDD 4계층 유지 (새 훅은 domains/defi/liquity/hooks/)
- Slider는 shared/components/ui/ (재사용 가능)

## 엣지케이스

- [ ] E-1: Trove 0개일 때 시장 평균 마커 숨김
- [ ] E-2: collateral=0 또는 debt=0일 때 Summary 값 "—" 표시
- [ ] E-3: CR < MCR일 때 Open 버튼 비활성화 + 경고 메시지
- [ ] E-4: 잔액 부족 시 버튼 텍스트 "Insufficient Balance"
