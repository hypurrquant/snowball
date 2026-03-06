# Step 01: Mock 가격 데이터 생성

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: ✅ (파일 삭제)
- **선행 조건**: 없음

---

## 1. 구현 내용 (design.md 기반)
- `domains/trade/data/mockPriceData.ts` 신규 생성
- PriceDataPoint 타입 정의 (`{ date: string; price: number }`)
- 4개 토큰 → 6개 쌍(4C2)의 ~30일치 mock 데이터 생성
- `getPairKey(a, b)`: 주소 정렬하여 방향 무관 키 생성
- `getPriceData(tokenIn, tokenOut)`: 쌍 데이터 조회, 역방향 시 1/price 변환
- 현실감 있는 가격 패턴 (트렌드 + 노이즈)

## 2. 완료 조건
- [ ] `domains/trade/data/mockPriceData.ts` 파일 존재
- [ ] PriceDataPoint 타입이 export됨
- [ ] getPriceData(TOKENS.wCTC, TOKENS.sbUSD) 호출 시 30개 데이터 포인트 배열 반환
- [ ] getPriceData(TOKENS.sbUSD, TOKENS.wCTC) 호출 시 역수 가격 반환
- [ ] 동일 토큰 쌍(tokenIn === tokenOut) 시 빈 배열 반환
- [ ] TypeScript 에러 없음

## 3. 롤백 방법
- `domains/trade/data/mockPriceData.ts` 삭제
- 영향 범위: 없음 (아직 참조하는 코드 없음)

---

## Scope

### 신규 생성 파일
```
apps/web/src/domains/trade/data/mockPriceData.ts  # 신규 - mock 데이터 + 조회 유틸
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| core/config/addresses.ts | 읽기 참조 | TOKENS 상수 import |

### Side Effect 위험
- 없음 (신규 파일, 기존 코드 미접촉)

### 참고할 기존 패턴
- `app/(more)/analytics/page.tsx`: MOCK_TVL_DATA 형식 참고

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| mockPriceData.ts | mock 데이터 + 유틸 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| PriceDataPoint 타입 | mockPriceData.ts 내 정의 | ✅ OK |
| getPairKey 유틸 | mockPriceData.ts 내 정의 | ✅ OK |
| getPriceData 유틸 | mockPriceData.ts 내 정의 | ✅ OK |

### 검증 통과: ✅

---

→ 다음: [Step 02: PriceChart 컴포넌트](step-02-price-chart.md)
