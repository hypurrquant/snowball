# DoD (Definition of Done) - v0.8.0

## 기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | `/pool/{token0}-{token1}` 접속 시 2컬럼 레이아웃 렌더링 (lg 이상: 왼쪽 Select Range + 오른쪽 Deposit) | 브라우저 1280px 이상에서 접속, 좌우 2컬럼 확인 |
| F2 | lg 미만 화면에서 1컬럼 세로 스택 (Select Range → Deposit 순서) | 브라우저 768px로 리사이즈, 세로 스택 확인 |
| F3 | 프리셋 5개 (Narrow/Common/Wide/Full/Custom) 카드 렌더링, 클릭 시 tick range 변경 | 각 프리셋 클릭 → MIN/MAX 가격 변경 확인 |
| F4 | Custom 프리셋: 사용자가 드래그/입력으로 범위 수정 시 자동 선택됨 | 드래그 핸들 이동 → Custom 카드 하이라이트 확인 |
| F5 | 유동성 히스토그램: mock tick data 기반 바 차트 렌더링 (바 개수 = range×2 = 80개), 범위 내 바 ice-blue, 범위 외 바 gray | DevTools Elements에서 `.flex-1` 자식 div 개수 = 80, 범위 내 바에 `bg-ice-400` 클래스 존재 |
| F6 | 현재가 수직선 (yellow) 히스토그램에 표시 | 노란색 수직선 존재 확인 |
| F7 | 드래그 핸들 2개 (min/max): 포인터 드래그로 tick range 조정, tickSpacing 스냅 | 핸들 드래그 → MIN/MAX 가격이 tickSpacing 배수로 변경 확인 |
| F8 | MIN/MAX 가격 입력 필드: 직접 입력 + ±step 버튼으로 tickSpacing 단위 조정 | +/- 클릭 → 가격 변경, 직접 숫자 입력 → blur 시 반영 |
| F9 | CURRENT PRICE 표시: 온체인 slot0에서 읽은 실제 현재가 | pool이 존재하는 pair 접속 시 현재가 > 0 표시 |
| F10 | 줌 컨트롤 (+/-/reset): 히스토그램 뷰포트 마진 조절. +는 마진 축소(확대), -는 마진 확대(축소), reset은 기본값 복원 | + 클릭 → 양쪽 끝 가격 축 값이 중앙으로 좁혀짐, - 클릭 → 넓어짐, reset → 초기 상태와 동일 |
| F11 | Token0 입력 필드 + Half 버튼(잔고의 50%) + Max 버튼(잔고 전체) | Half 클릭 → 잔고/2 입력, Max 클릭 → 잔고 전체 입력 |
| F12 | Token1 입력 필드 + Half/Max 동일 | F11과 동일하게 token1에서 동작 확인 |
| F13 | USD 환산 표시: 각 토큰 입력 옆에 `~$X.XX` (TOKEN_INFO.mockPriceUsd 기반) | 1.0 wCTC 입력 → ~$2.50 표시 확인 |
| F14 | Total Deposit: token0 USD + token1 USD 합산 표시 | 양쪽 금액 입력 → Total Deposit 합산 표시 |
| F15 | 토큰 비율 바: amount0Usd/totalUsd × 100 비율로 progress bar 표시 | 양쪽 금액 입력 → 비율 바 업데이트 확인 |
| F16 | Estimated APR: usePoolList에서 token0-token1 매칭되는 풀의 feesAPR 값 표시. 매칭 실패 시 "—" 표시 | pair에 해당하는 풀의 APR 값이 DepositPanel 하단에 표시 확인 |
| F17 | 액션 버튼 상태 머신: 미연결→"Connect Wallet"(disabled, 연결은 Header의 글로벌 Connect 버튼 사용), 미입력→"Enter Amount"(disabled), 승인필요→"Approve {symbol}"(active), 준비→"Add Liquidity"(active), 진행중→spinner+텍스트 | ① 지갑 미연결→"Connect Wallet"+disabled ② 연결 후 금액 미입력→"Enter Amount"+disabled ③ 금액 입력+미승인→"Approve wCTC"+active, 클릭 가능 ④ 승인 완료→"Add Liquidity"+active ⑤ 클릭→spinner+"Adding..." 표시 |
| F18 | Approve → Mint 순차 트랜잭션: approve 완료 후 mint 호출 | 테스트넷에서 금액 입력 → Approve 클릭 → 지갑 서명 → Mint 클릭 → 지갑 서명, 트랜잭션 해시 콘솔 출력 |

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | TypeScript strict 모드 신규 에러 0 (기존 PriceChart.tsx 에러 제외) | `npx tsc --noEmit` — 에러가 PriceChart.tsx:99만 남아있는지 확인 |
| N2 | DDD 레이어 위반 없음: `core/dex/` 파일에 'react' import 없음. `app/(trade)/pool/[pair]/page.tsx`는 useCreatePosition 호출 + 컴포넌트 배치만 수행 (계산/상태 로직은 훅 내부) | `grep -r "from 'react'" apps/web/src/core/dex/` 결과 0건. page.tsx에 useState/useMemo/계산식 없음 확인 |
| N3 | 신규/수정 파일이 설계 문서의 파일 변경 목록과 일치 | `git diff --name-only` 결과 vs design.md 파일 변경 목록 비교 |
| N4 | 기존 pool list 페이지(`/pool`) 정상 동작 유지 | `/pool` 접속 → 풀 목록 렌더링 + 풀 클릭 → `/pool/[pair]`로 이동 확인 |

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | 존재하지 않는 pool pair로 접속 (factory.getPool → zero address) | 히스토그램 "No liquidity data" 표시, 현재가 "—" | 임의 주소 pair URL로 접속 |
| E2 | 지갑 미연결 상태 | 잔고 "—", Half/Max 비활성, 버튼 "Connect Wallet" (disabled) | 지갑 연결 없이 페이지 접속 |
| E3 | Full Range 프리셋 선택 | tickLower = alignTickToSpacing(-887272, spacing, true), tickUpper = alignTickToSpacing(887272, spacing, false). MIN 가격 < 0.0001, MAX 가격 > 1e30 | Full 클릭 → MIN 가격 입력 필드에 지수 표기(예: 4.30e-39), MAX 가격에 지수 표기 |
| E4 | USDC(6 decimals) 포함 pair | parseTokenAmount이 6 decimals 정상 처리 | USDC pair 접속 → 금액 입력 → 에러 없음 |
| E5 | 금액 0 입력 상태에서 Add Liquidity 클릭 | 버튼 disabled ("Enter Amount") | 금액 미입력 → 버튼 비활성 확인 |
| E6 | 드래그로 tickLower >= tickUpper 시도 | clamp: tickLower = tickUpper - tickSpacing | min 핸들을 max 너머로 드래그 → 교차 불가 확인 |

## PRD 목표 ↔ DoD 커버리지

| PRD 목표 | DoD 항목 | 커버 |
|----------|---------|------|
| 2컬럼 레이아웃 (KittenSwap 스타일) | F1, F2 | ✅ |
| Tick 기반 가격 표시 및 조정 | F7, F8, F9 | ✅ |
| 유동성 히스토그램 시각화 | F5, F6, F10 | ✅ |
| 프리셋 카드 | F3, F4 | ✅ |
| 토큰 입력 + Half/Max | F11, F12 | ✅ |
| USD 환산 | F13, F14 | ✅ |
| 토큰 비율 바 | F15 | ✅ |
| Estimated APR (usePoolList.feesAPR) | F16 | ✅ |
| Approve + Mint 트랜잭션 | F17, F18 | ✅ |

## 설계 결정 ↔ DoD 반영

| 설계 결정 | DoD 반영 | 커버 |
|----------|---------|------|
| 대안B: useCreatePosition + DepositPanel 분리 | N3 (파일 목록 일치) | ✅ |
| tick 검증 = PriceRangeSelector 전담 | E6 (교차 방지) | ✅ |
| TOKEN_INFO.mockPriceUsd | F13 (USD 환산) | ✅ |
| 반응형 1컬럼 스택 | F2 | ✅ |
| DDD 4계층 준수 | N2 | ✅ |
| parseTokenAmount (decimals 대응) | E4 (USDC 6 decimals) | ✅ |
