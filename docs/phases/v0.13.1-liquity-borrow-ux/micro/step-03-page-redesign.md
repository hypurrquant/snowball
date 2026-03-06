# Step 03: Open Trove 다이얼로그 리디자인

## 구현
- `app/(defi)/liquity/borrow/page.tsx` 수정
- Open Trove Dialog 내부를 1기 Borrow.tsx 기반으로 리디자인

### 변경 내용
1. Collateral Input: HALF/MAX 버튼 + USD 환산 표시
2. Borrow Input: SAFE 버튼 + Max borrow 표시
3. Interest Rate: Slider + 컬러 그라데이션 + 시장 평균 마커
4. Position Summary 카드: HF, Liq Price, Upfront Fee, Annual Cost, MCR/CCR
5. 에러 표시: CR < MCR 경고, 잔액 부족
6. 버튼 텍스트 동적 변경

## Scope
- `app/(defi)/liquity/borrow/page.tsx` (주요 수정 대상)

## 완료 조건
- [ ] F-1: 슬라이더 동작 + 그라데이션 + 마커
- [ ] F-2: Position Summary 실시간 계산
- [ ] F-3: HALF/MAX/SAFE 동작
- [ ] F-4: 시장 평균 표시
- [ ] E-1~E-4: 엣지케이스 처리
