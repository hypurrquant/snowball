# Step 07: 프론트엔드 연동 (usePoolList, useProtocolStats → API + mock fallback)

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (hooks git restore)
- **선행 조건**: Step 06 (REST API)
- **DoD 커버**: F10, F11, F12, E5

---

## 1. 구현 내용 (design.md 기반)

- apps/web/.env.local에 NEXT_PUBLIC_API_URL 추가 (기본값 없음)
- usePoolList hook 수정:
  - NEXT_PUBLIC_API_URL 설정 시: fetch(`${apiUrl}/api/pools`) → React Query
  - 미설정 시: 기존 MOCK_POOLS 반환
  - 서버 에러 시: mock fallback (catch → mock)
- useProtocolStats hook 수정:
  - NEXT_PUBLIC_API_URL 설정 시: fetch(`${apiUrl}/api/protocol/stats`)
  - 미설정 시: 기존 mock 데이터
  - 서버 에러 시: mock fallback
- API 응답 타입을 @snowball/core에서 공유 (또는 프론트에서 자체 타입 정의)

## 2. 완료 조건
- [ ] `NEXT_PUBLIC_API_URL=http://localhost:3001` 설정 후 /pool 페이지에서 서버 실데이터 표시
- [ ] env 미설정 시 /pool 페이지에서 mock 데이터 표시
- [ ] 서버 미실행 + NEXT_PUBLIC_API_URL 설정 상태에서 /pool 페이지 → mock fallback, 콘솔 에러 없음
- [ ] useProtocolStats도 동일하게 API/mock fallback 동작
- [ ] `pnpm --filter web build` 성공
- [ ] `cd apps/web && npx tsc --noEmit` 성공

## 3. 롤백 방법
- usePoolList.ts, useProtocolStats.ts git restore
- .env.local에서 NEXT_PUBLIC_API_URL 제거

---

## Scope

### 수정 대상 파일
```
apps/web/src/domains/trade/hooks/usePoolList.ts       # API fetch + mock fallback
apps/web/src/domains/trade/hooks/useProtocolStats.ts   # API fetch + mock fallback
```

### 신규 생성 파일
```
apps/web/.env.local.example   # NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| /pool 페이지 | 간접 영향 | usePoolList 반환값 변경 가능 (타입 호환 유지) |
| /analytics 페이지 | 간접 영향 | useProtocolStats 사용 |
| React Query / fetch | 신규 | API 호출 패턴 추가 |

### Side Effect 위험
- usePoolList의 PoolListItem 타입이 변경될 수 있음 → 기존 UI 컴포넌트 호환성 확인
- 기존 mock의 formatted string ("$1.2M") vs API의 raw number → 타입/포맷 변환 필요

### 참고할 기존 패턴
- `usePoolList.ts` 기존 MOCK_POOLS 구조
- `useProtocolStats.ts` 기존 mock 구조

## FP/FN 검증

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| usePoolList API 연동 | ✅ | OK |
| useProtocolStats API 연동 | ✅ | OK |
| Mock fallback | ✅ 각 hook에 포함 | OK |
| 서버 에러 시 fallback | ✅ catch → mock | OK |
| .env.local.example | ✅ | OK |
| 타입 변환 (raw number → formatted) | ✅ hook 내부에서 처리 | OK |

### 검증 통과: ✅

---

→ 완료: 모든 Step 개발 완료 후 Phase Complete
