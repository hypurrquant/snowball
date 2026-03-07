# Step 04: LPPortfolioSummary 컴포넌트

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: ✅ (신규 파일 1개)
- **선행 조건**: Step 02 (UseUserPositionsReturn 타입)

---

## 1. 구현 내용 (design.md 기반)
- `domains/trade/components/LPPortfolioSummary.tsx` 신규 생성
- StatCard 그리드 3개:
  1. Total Net Value (USD)
  2. Active Positions 수
  3. Total Uncollected Fees (USD)

## 2. 완료 조건
- [ ] `LPPortfolioSummary` 컴포넌트가 totalValueUsd, positionCount, totalFeesUsd props를 받아 렌더링
- [ ] StatCard 3개가 가로 그리드로 배치 (grid-cols-3)
- [ ] 각 StatCard에 아이콘, 라벨, 값 표시

## 3. 롤백 방법
- `LPPortfolioSummary.tsx` 파일 삭제

---

## Scope

### 신규 생성 파일
```
apps/web/src/domains/trade/components/LPPortfolioSummary.tsx  # 신규 - 포트폴리오 요약
```

### 참고할 기존 패턴
- `app/(more)/dashboard/page.tsx`: StatCard 그리드 패턴

## FP/FN 검증
### 검증 통과: ✅

---

→ 다음: [Step 05: /pool/positions 페이지](step-05-positions-page.md)
