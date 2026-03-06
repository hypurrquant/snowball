# Step 04: useOptionsPrice WS 재연결

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅
- **선행 조건**: 없음
- **DoD 매핑**: F6, F7, F8, E3

---

## 1. 구현 내용 (design.md 기반)
- `onclose` 이벤트에서 exponential backoff 재연결 (1s → 2s → 4s, 최대 3회)
- 3회 실패 시 polling fallback (10초 간격 REST `GET /api/price/btc/current`)
- `useRef`로 관리: retryCount, reconnectTimer, pollingInterval
- cleanup에서 모든 타이머/인터벌 정리
- 빈 `catch {}` 3곳 → `console.warn`으로 교체

## 2. 완료 조건
- [ ] `grep -E "MAX_RETRIES.*3|retryCount" apps/web/src/hooks/options/useOptionsPrice.ts` → 최대 3회 재시도 로직 매치
- [ ] `grep -E "1000|2000|4000|2 \*\*|Math.pow" apps/web/src/hooks/options/useOptionsPrice.ts` → exponential backoff 간격 (1s/2s/4s) 매치
- [ ] `grep -E "10.?000|setInterval|polling" apps/web/src/hooks/options/useOptionsPrice.ts` → 10초 간격 polling fallback 매치
- [ ] `grep "catch {}" apps/web/src/hooks/options/useOptionsPrice.ts` → 결과 없음 (F8)
- [ ] `grep "console.warn" apps/web/src/hooks/options/useOptionsPrice.ts` → 에러 로깅 존재
- [ ] `cd apps/web && npx tsc --noEmit` 성공 (N1)

## 3. 롤백 방법
- 롤백 절차: git checkout으로 원래 WS 로직 복원
- 영향 범위: Options 페이지 가격 피드

---

## Scope

### 수정 대상 파일
```
apps/web/src/
└── hooks/options/useOptionsPrice.ts  # 수정 - WS 재연결 로직 추가 + catch 블록 수정
```

### 신규 생성 파일
없음

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| useOptionsPrice.ts | 직접 수정 | WS useEffect 전면 재작성 |
| options/page.tsx | 간접 영향 | 훅 소비자 — 반환 타입 동일하므로 수정 불필요 |

### Side Effect 위험
- 위험 1: 재연결 타이머가 컴포넌트 언마운트 후에도 실행
  - 대응: cleanup에서 `clearTimeout(reconnectTimer)` + `clearInterval(pollingInterval)` 필수
- 위험 2: 여러 WS 인스턴스 동시 생성 (race condition)
  - 대응: 재연결 전 기존 ws.close() 호출, wsRef로 단일 인스턴스 관리
- 위험 3: OHLCV 60초 인터벌과 polling 10초 인터벌 중복
  - 대응: OHLCV는 별도 useEffect로 독립 관리 (기존 구조 유지), polling은 currentPrice만 담당

### 참고할 기존 패턴
- 현재 WS 연결: lines 27-60 (단일 useEffect, onerror에서 1회 poll 후 중단)
- REST endpoint: `${API_BASE}/api/price/btc/current` (이미 onerror에서 사용 중)
- OHLCV fetch: lines 63-88 (독립 useEffect, 60초 인터벌)

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| useOptionsPrice.ts | WS 재연결 + catch 수정 대상 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| exponential backoff (1s/2s/4s) | ✅ useOptionsPrice.ts | OK |
| polling fallback (10s) | ✅ useOptionsPrice.ts | OK |
| useRef 타이머 관리 | ✅ useOptionsPrice.ts | OK |
| catch {} → console.warn | ✅ useOptionsPrice.ts (3곳) | OK |
| cleanup 정리 | ✅ useOptionsPrice.ts | OK |

### 검증 통과: ✅

---

→ 다음: [Step 05: 색상 토큰 통일](step-05-color-tokens.md)
