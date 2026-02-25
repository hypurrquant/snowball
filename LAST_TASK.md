# Last Task Summary — 2025-02-25

## Frontend E2E 테스트 구축 (Playwright)

### 목표
`packages/frontend/`에 Playwright 기반 E2E 테스트 77개 작성 → **100% 통과**

### 결과
- **77 specs 전부 통과** (2분 소요)
- 12개 spec 파일, 3개 fixture 파일, 1개 config

### 신규 파일 (16개)

| 파일 | 설명 |
|------|------|
| `playwright.config.ts` | Chromium only, 60s timeout, webServer 자동시작 |
| `e2e/fixtures/wallet.ts` | wagmi mock connector로 지갑 연결 |
| `e2e/fixtures/api-mocks.ts` | price/options/chat API 응답 모킹 |
| `e2e/fixtures/index.ts` | mergeTests로 통합 export |
| `e2e/pages/home.spec.ts` | 5 tests — hero, 카드, 네비게이션 |
| `e2e/pages/swap.spec.ts` | 7 tests — 토큰 선택, 금액 입력, flip |
| `e2e/pages/pool.spec.ts` | 6 tests — 풀 목록, Deposit 버튼 |
| `e2e/pages/lend.spec.ts` | 4 tests — 통계, 마켓 카드 |
| `e2e/pages/borrow.spec.ts` | 6 tests — 탭 전환, Trove 다이얼로그 |
| `e2e/pages/earn.spec.ts` | 7 tests — 입금/출금, 탭 전환 |
| `e2e/pages/options.spec.ts` | 7 tests — Over/Under, 차트, 주문 |
| `e2e/pages/dashboard.spec.ts` | 5 tests — 잔고 카드, Quick Actions |
| `e2e/pages/analytics.spec.ts` | 6 tests — TVL 차트, 풀 테이블 |
| `e2e/pages/chat.spec.ts` | 5 tests — 메시지 전송/응답 |
| `e2e/flows/navigation.spec.ts` | 13 tests — 사이드바, 모바일 메뉴 |
| `e2e/flows/wallet-connect.spec.ts` | 6 tests — 연결/해제, 주소 표시 |

### 수정 파일 (5개)

| 파일 | 변경 내용 |
|------|-----------|
| `package.json` | `@playwright/test` devDep, `test:e2e` 스크립트 추가 |
| `src/components/providers.tsx` | `NEXT_PUBLIC_TEST_MODE` 분기 → Privy 스킵, wagmi mock 사용 |
| `src/config/wagmi.ts` | `createTestWagmiConfig()` 추가 (mock connector) |
| `src/components/layout/Header.tsx` | `PrivyHeader`/`TestHeader` 분리 (test mode 호환) |
| `.gitignore` | `test-results/`, `playwright-report/` 등 추가 |

### 실행 방법

```bash
cd packages/frontend

# 테스트 실행 (dev 서버 자동 시작)
NEXT_PUBLIC_TEST_MODE=true pnpm test:e2e

# UI 모드
NEXT_PUBLIC_TEST_MODE=true pnpm test:e2e:ui
```

### 아키텍처 결정

- **Privy 스킵**: `NEXT_PUBLIC_TEST_MODE=true` 환경변수로 PrivyProvider 우회
- **지갑 모킹**: wagmi `mock()` connector + Header의 Connect 버튼 클릭으로 연결
- **API 모킹**: `page.route()` 인터셉트 (price, options, chat)
- **브라우저**: Chromium만 (Web3 dApp은 브라우저 차이 미미)
- **병렬**: `fullyParallel: false` (체인 상태 의존성)
