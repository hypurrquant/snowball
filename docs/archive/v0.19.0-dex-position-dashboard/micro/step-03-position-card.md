# Step 03: PositionCard 컴포넌트

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (신규 파일 1개)
- **선행 조건**: Step 02 (UserPosition 타입 정의)

---

## 1. 구현 내용 (design.md 기반)
- `domains/trade/components/PositionCard.tsx` 신규 생성
- 단일 LP 포지션 정보 표시:
  - 토큰 페어 아이콘 + 심볼 + Fee tier badge
  - 유동성 크기 (USD)
  - In Range / Out of Range badge (green/red)
  - 미수령 수수료 (tokensOwed0, tokensOwed1)
  - Manage 버튼 → `/pool/{token0}-{token1}` 이동

## 2. 완료 조건
- [ ] `PositionCard` 컴포넌트가 `UserPosition` props를 받아 렌더링
- [ ] 토큰 심볼, Fee tier (예: 0.3%) 표시
- [ ] In Range = green badge, Out of Range = red badge
- [ ] 포지션 가치 USD 표시
- [ ] tokensOwed0/tokensOwed1 표시 (토큰 수량 + USD)
- [ ] Manage 버튼 클릭 시 `/pool/{token0}-{token1}` 라우팅

## 3. 롤백 방법
- `PositionCard.tsx` 파일 삭제

---

## Scope

### 신규 생성 파일
```
apps/web/src/domains/trade/components/PositionCard.tsx  # 신규 - 포지션 카드
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| Card, Badge, Button | 읽기 | 기존 UI 컴포넌트 사용 |
| UserPosition 타입 | 읽기 | Step 02에서 정의 |
| next/link | 읽기 | Manage 버튼 라우팅 |
| TOKEN_INFO | 읽기 | 토큰 아이콘 경로 |

### 참고할 기존 패턴
- `app/(trade)/pool/page.tsx`의 `TrendingPoolCard`: 토큰 아이콘 + 풀 정보 카드

## FP/FN 검증
### 검증 통과: ✅

---

→ 다음: [Step 04: LPPortfolioSummary 컴포넌트](step-04-portfolio-summary.md)
