# Step 05: /pool/positions 페이지

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (신규 파일 1개)
- **선행 조건**: Step 02, 03, 04

---

## 1. 구현 내용 (design.md 기반)
- `app/(trade)/pool/positions/page.tsx` 신규 생성
- 페이지 조립:
  - 헤더: "My LP Positions"
  - 지갑 미연결: "Connect your wallet to view positions" 안내
  - 포지션 0개: "No active positions" + "New Position" CTA
  - 20개 초과: "최대 20개만 표시" 안내
  - LPPortfolioSummary (상단)
  - PositionCard × N (목록)
- useUserPositions hook 연결

## 2. 완료 조건
- [ ] `/pool/positions` 라우트가 접근 가능
- [ ] 지갑 미연결 시 "Connect your wallet to view positions" 안내 표시 (DoD E1 일치)
- [ ] 포지션 0개일 때 빈 상태 + "New Position" 링크 표시
- [ ] 포지션 있을 때 LPPortfolioSummary + PositionCard 목록 렌더링
- [ ] positionCount > 20일 때 "최대 20개만 표시" 안내 문구

**Nice to have (필수 아님)**:
- 로딩 중 isLoading 상태 시각적 표시 (Skeleton 또는 스피너)

## 3. 롤백 방법
- `pool/positions/page.tsx` 파일 삭제

---

## Scope

### 신규 생성 파일
```
apps/web/src/app/(trade)/pool/positions/page.tsx  # 신규 - 포지션 대시보드 페이지
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| useUserPositions | 호출 | Step 02 hook |
| LPPortfolioSummary | 렌더링 | Step 04 컴포넌트 |
| PositionCard | 렌더링 | Step 03 컴포넌트 |
| wagmi useAccount | 읽기 | 지갑 연결 상태 확인 |

### 참고할 기존 패턴
- `app/(more)/dashboard/page.tsx`: 지갑 미연결 분기 + StatCard 레이아웃
- `app/(trade)/pool/page.tsx`: 페이지 헤더 + 카드 목록 구조

## FP/FN 검증
### 검증 통과: ✅

---

→ 다음: [Step 06: MyPositionsBanner + Pool 페이지 수정](step-06-banner.md)
