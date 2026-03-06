# TODO: apps/web 코드 품질 개선

> v0.2.1 완료 후 전체 스캔에서 발견된 추가 이슈들 (2026-03-06)
> Codex + Claude 공동 분석 결과

---

## 즉시 수정 가능 (코드만으로 해결)

### B1. Silent Transaction Failures — toast 에러 핸들링
- **문제**: 10개 catch 블록이 `console.error`만 호출, 사용자에게 에러 표시 없음
- **대상 파일**:
  - `src/app/(defi)/earn/page.tsx` (3곳)
  - `src/app/(options)/options/page.tsx` (2곳)
  - `src/app/(trade)/swap/page.tsx` (1곳)
  - `src/app/(trade)/pool/add/page.tsx` (1곳)
  - `src/components/yield/VaultActionDialog.tsx` (3곳)
- **해결**: `sonner` toast 이미 설치됨 → `toast.error()` 추가
- **난이도**: 낮음

### C1. TOKEN_LIST 중복
- **문제**: `Object.entries(TOKENS) as [string, Address][]` 가 swap/page.tsx:16, pool/add/page.tsx:18에 동일하게 정의
- **해결**: `config/addresses.ts`에서 export
- **난이도**: 낮음

### C2. Pool Ratio 계산식 중복
- **문제**: `options/page.tsx` 195행/200행에 동일한 BigInt→Number 비율 계산 반복
- **해결**: 변수로 추출
- **난이도**: 낮음

### C3. RPC URL 중복 정의
- **문제**: `config/addresses.ts:5`와 `config/chain.ts:13`에 동일한 RPC URL 독립 정의
- **해결**: `chain.ts`에서 `addresses.ts`의 `RPC_URL` import
- **난이도**: 낮음

### D1. API 경로 산재
- **문제**: `/api/price/btc/current`, `/ws/price`, `/api/options/order` 등이 각 hook에 하드코딩
- **해결**: `config/api.ts` 같은 중앙 상수 파일 생성
- **난이도**: 낮음

### H1. localhost Fallback 프로덕션 노출
- **문제**: `API_BASE`, `CHAT_API_BASE`의 fallback이 `http://localhost:8000/3002` → env 미설정 시 프로덕션에서 localhost 호출
- **파일**: `config/addresses.ts`
- **해결**: fallback 제거, env 필수화 또는 프로덕션 URL로 교체
- **난이도**: 낮음

### H2. Empty Catch Blocks
- **문제**: swap/page.tsx parseEther, options/history/page.tsx fetch — 에러 무시
- **해결**: console.warn + 적절한 사용자 피드백
- **난이도**: 낮음

### H3. useOptionsPrice retryCount 리셋 누락
- **문제**: 컴포넌트 remount 시 `retryCountRef`가 리셋 안 됨 → stale 상태
- **해결**: cleanup에서 리셋 추가
- **난이도**: 낮음

### Codex 추가 발견 1. BigInt 정밀도 손실
- **문제**: `options/page.tsx`에서 `Number(bigint)` — 큰 값에서 정밀도 손실
- **해결**: `formatUnits` 또는 BigInt 연산으로 교체
- **난이도**: 낮음

### Codex 추가 발견 2. Unstable React Key
- **문제**: `options/history/page.tsx`에서 `key={i}` 사용
- **해결**: `key={roundId-timestamp}` 같은 stable key
- **난이도**: 낮음

---

## 설계/백엔드 의존 (별도 Phase 필요)

### G1. EIP-712 서명 Placeholder
- **문제**: `options/page.tsx:68` — `signature: "0x"`, `nonce: 0` → 무효한 서명으로 주문 제출
- **해결**: `useSignTypedData` + `OptionsRelayerABI`의 `nonces`/`DOMAIN_SEPARATOR`/`ORDER_TYPEHASH` 사용
- **의존성**: 백엔드 서명 검증 로직 필요
- **난이도**: 높음

### F1. 하드코딩 Borrow APR
- **문제**: `useLendMarkets.ts:70` — `util * 0.08` 데모용 → 실제 APR 표시 안 됨
- **해결**: `AdaptiveCurveIRM.borrowRateView()` 온체인 호출
- **의존성**: marketParams + market 데이터 필요
- **난이도**: 높음

### E2. Borrow 모달 Input 미연결
- **문제**: `borrow/page.tsx:176,180` — Input이 state에 연결 안 됨 (비기능 UI)
- **해결**: state 연결 + 담보비율/청산가 계산 + write 연동
- **의존성**: 프로덕트 설계 결정 필요
- **난이도**: 중간

### Codex 추가 발견 3. useLendMarkets Positional Oracle Lookup
- **문제**: 인덱스 기반 오라클 매핑 → 불일치 시 잘못된 오라클 연결
- **해결**: `idToMarketParams` 명시적 매핑
- **난이도**: 중간

---

## Type Safety 개선 (낮은 우선순위)

### A1. useOptions.ts — 8x `as any` 캐스트
- `roundData` 접근 시 ABI 타입 추론 불가 → 수동 캐스트
- ABI 타입 정의 개선으로 해결 가능

### A2. PriceChart.tsx — `time: d.time as any`
- lightweight-charts 타입 호환 문제

### A3. useOptionsPrice.ts — `(c: any)` OHLCV 응답
- API 응답 타입 정의 필요

### A4. providers.tsx — `window as any` (의도적, 테스트 전용)
- 유지해도 무방

---

## 미완성 UI (프로덕트 결정 필요)

### E1. Swap Settings 버튼 — onClick 없음
- `swap/page.tsx:79` — 기어 아이콘 버튼이 동작 안 함

### E3. Dashboard 차트 Placeholder
- `dashboard/page.tsx:152-155` — "Loading Chart Data..." 영구 스피너
