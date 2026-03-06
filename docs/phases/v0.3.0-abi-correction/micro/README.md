# 작업 티켓 - v0.3.0

## 전체 현황

| # | Step | 난이도 | 롤백 | Scope | FP/FN | 개발 | 완료일 |
|---|------|--------|------|-------|-------|------|--------|
| 01 | liquity.ts ABI + borrow 동기화 | 🟠 | ✅ | ✅ | ✅ | ✅ 완료 | 2026-03-06 |
| 02 | lend.ts ABI + useLendMarkets 동기화 | 🟢 | ✅ | ✅ | ✅ | ✅ 완료 | 2026-03-06 |
| 03 | options.ts ABI + useOptions + page 동기화 | 🟠 | ✅ | ✅ | ✅ | ✅ 완료 | 2026-03-06 |
| 04 | dex.ts ABI 추가 | 🟢 | ✅ | ✅ | ✅ | ✅ 완료 | 2026-03-06 |
| 05 | 통합 검증 (tsc + build) | 🟢 | N/A | ✅ | N/A | ✅ 완료 | 2026-03-06 |

## 의존성

```
01 ─┐
02 ─┼─→ 05 (통합 검증)
03 ─┤
04 ─┘
```

Step 01~04는 서로 독립 (병렬 가능). Step 05는 01~04 모두 완료 후 실행.

## 커버리지 매트릭스

### PRD 목표 → 티켓

| PRD 목표 | 관련 티켓 | 커버 |
|----------|----------|------|
| CRITICAL 16건 수정 (잘못된 ABI 교정) | Step 01, 02, 03 | ✅ |
| HIGH 7건 보완 (누락 함수 추가) | Step 01, 02, 03, 04 | ✅ |
| MEDIUM 6건 보완 (타입 불일치·부분 누락) | Step 01, 03 | ✅ |
| Dead import 4건 정리 | Step 01, 02, 03 | ✅ |
| 호출부 함수명·파라미터 동기화 | Step 01, 02, 03 | ✅ |

### DoD → 티켓

| DoD 항목 | 관련 티켓 | 커버 |
|----------|----------|------|
| F1: liquity.ts ABI ↔ 소스 일치 | Step 01 | ✅ |
| F2: lend.ts ABI ↔ 소스 일치 | Step 02 | ✅ |
| F3: options.ts ABI ↔ 소스 일치 | Step 03 | ✅ |
| F4: dex.ts 누락 함수 추가 | Step 04 | ✅ |
| F5: OptionsRelayerABI 추가 | Step 03 | ✅ |
| F6: borrow/page.tsx 함수명 교정 | Step 01 | ✅ |
| F7: useLendMarkets.ts 함수명 교정 | Step 02 | ✅ |
| F8: useOptions.ts 함수명 교정 | Step 03 | ✅ |
| F9: options/page.tsx deposit() 인자 제거 | Step 03 | ✅ |
| F10: Dead import 0건 | Step 01, 02, 03, 05(검증) | ✅ |
| N1: TypeScript 컴파일 에러 0 | Step 05 | ✅ |
| N2: Next.js 빌드 성공 | Step 05 | ✅ |
| N3: yield.ts 무변경 | Step 05 | ✅ |
| N4: abis/index.ts export 구조 유지 | Step 05 | ✅ |
| E1: 배포 컨트랙트 vs 소스 차이 | Step 01, 02, 03 (소스 기준) | ✅ |
| E2: LatestTroveData struct 필드 순서 | Step 01 | ✅ |
| E3: getRound Round struct 필드 순서 | Step 03 | ✅ |
| E4: deposit() payable value 전달 | Step 03 | ✅ |

### 설계 결정 → 티켓

| 설계 결정 | 관련 티켓 | 커버 |
|----------|----------|------|
| ABI `as const` 패턴 유지 | Step 01, 02, 03, 04 | ✅ |
| 컨트랙트 소스에서 직접 추출 | Step 01, 02, 03, 04 | ✅ |
| struct는 tuple components로 정의 | Step 01 (LatestTroveData), 03 (Round), 04 (params) | ✅ |
| yield.ts 무변경 | Step 05 | ✅ |

**커버리지: 100% — 누락 없음**

## Step 상세
- [Step 01: liquity.ts ABI + borrow 동기화](step-01-liquity-abi.md)
- [Step 02: lend.ts ABI + useLendMarkets 동기화](step-02-lend-abi.md)
- [Step 03: options.ts ABI + useOptions + page 동기화](step-03-options-abi.md)
- [Step 04: dex.ts ABI 추가](step-04-dex-abi.md)
- [Step 05: 통합 검증](step-05-verify.md)
