# Snowball Frontend — Design Improvement Plan

> **대상:** 디자인/프론트엔드 담당자
> **현재 상태:** 기능 구현 완료, 디자인 개선 필요
> **목표:** DeFi 업계 Top-tier 수준의 UI/UX (Aave, Jupiter, Drift 참고)

---

## 1. 프로젝트 개요

Snowball은 Creditcoin Testnet(chainId 102031) 위에 동작하는 통합 DeFi 프로토콜입니다.

### 주요 기능 (14개 라우트)

| 그룹 | 라우트 | 기능 | 현재 상태 |
|------|--------|------|-----------|
| **Trade** | `/swap` | 토큰 스왑 (Algebra V4 DEX) | 기능 완료, 디자인 기본 |
| | `/pool` | 풀 목록 | 기능 완료 |
| | `/pool/add` | 유동성 추가 (3단계 폼) | 기능 완료 |
| **DeFi** | `/lend` | Morpho 렌딩 마켓 테이블 | 기능 완료 |
| | `/borrow` | Liquity Trove 관리 | 부분 구현 (상세 관리 UI 없음) |
| | `/earn` | Stability Pool 예치/출금 | 기능 완료 |
| **Options** | `/options` | BTC 바이너리 옵션 트레이딩 | 기능 완료 |
| | `/options/history` | 거래 이력 테이블 | 기능 완료 |
| **More** | `/dashboard` | 사용자 잔고/포지션 요약 | 기능 완료 |
| | `/analytics` | 프로토콜 분석 | **플레이스홀더** |
| | `/agent` | ERC-8004 에이전트 | **스텁 UI** |
| | `/chat` | AI 챗 인터페이스 | 기능 완료 |

### 기술 스택

- **Next.js 15.5** + React 19 + TypeScript 5.9
- **Tailwind CSS 4.2** (CSS-first `@theme` 설정)
- **Privy** auth (이메일/구글/지갑 + 임베디드 지갑)
- **wagmi 2.14** + viem 2.21
- **shadcn/ui 패턴** (Button, Card, Input, Badge, Tabs)
- **Lightweight Charts** (옵션 캔들스틱)
- **Lucide React** icons

---

## 2. 현재 디자인 시스템

### 2.1 컬러 팔레트

```
배경 계층
┌──────────────────────────────────────────┐
│  bg-primary    #0A0B14  메인 배경         │
│  bg-secondary  #0d1117  헤더/사이드바       │
│  bg-card       #141525  카드              │
│  bg-input      #1C1D30  입력 필드          │
│  bg-hover      #1a2035  호버              │
│  bg-active     #1e293b  액티브             │
└──────────────────────────────────────────┘

Ice Blue 악센트 (브랜드 컬러)
┌──────────────────────────────────────────┐
│  ice-50   #eff6ff                        │
│  ice-100  #dbeafe                        │
│  ice-200  #bfdbfe                        │
│  ice-300  #93c5fd                        │
│  ice-400  #60a5fa  ← 메인 악센트          │
│  ice-500  #3b82f6                        │
│  ice-600  #2563eb                        │
└──────────────────────────────────────────┘

텍스트
  text-primary    #F5F5F7
  text-secondary  #8B8D97
  text-tertiary   #4A4B57

상태 색상
  success   #22c55e (녹색)
  warning   #eab308 (노란)
  danger    #ef4444 (빨간)

보더
  border        #1F2037
  border-hover  #2d3748
```

### 2.2 타이포그래피

- **Sans:** Inter (400, 500, 600, 700)
- **Mono:** JetBrains Mono (숫자, 주소, 금액)

### 2.3 그림자 & 글로우

```css
--shadow-ice:       0 0 20px rgba(96, 165, 250, 0.2)   /* 은은한 글로우 */
--shadow-ice-lg:    0 0 40px rgba(96, 165, 250, 0.3)   /* 강한 글로우 */
--shadow-card:      0 4px 24px rgba(0, 0, 0, 0.4)      /* 카드 그림자 */
--shadow-card-hover: 0 8px 32px rgba(96, 165, 250, 0.15) /* 카드 호버 */
```

### 2.4 기존 CSS 유틸리티

| 유틸리티 | 설명 |
|----------|------|
| `card` | bg-card + border + rounded-2xl + p-5 |
| `card-hover` | hover 시 ice border + shadow |
| `btn-primary` | ice 그라디언트 + glow shadow |
| `btn-secondary` | bg-hover + border |
| `text-gradient-ice` | ice-300 → ice-500 그라디언트 텍스트 |
| `section-title` | 12px, uppercase, tracking-wider, tertiary |

### 2.5 애니메이션

| 이름 | 효과 |
|------|------|
| `float` | Y축 -10px 부유 (6초 주기) |
| `glow` | ice blue 박스 쉐도우 펄스 (2초) |
| `slideUp` | 아래에서 위로 (0.3초) |
| `fadeIn` | 페이드 인 (0.4초) |
| `pulse-slow` | 느린 펄스 (3초) |

---

## 3. 현재 컴포넌트 인벤토리

### 3.1 UI 기본 컴포넌트 (`/components/ui/`)

| 컴포넌트 | 파일 | Variants | 상태 |
|----------|------|----------|------|
| **Button** | `button.tsx` | default, destructive, outline, secondary, ghost, link, success, warning × 4 sizes | ✅ 완성 |
| **Card** | `card.tsx` | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter | ✅ 완성 |
| **Input** | `input.tsx` | 단일 텍스트 입력 | ⚠️ textarea, number 변형 없음 |
| **Badge** | `badge.tsx` | default, secondary, success, warning, destructive, outline | ✅ 완성 |
| **Tabs** | `tabs.tsx` | Tabs, TabsList, TabsTrigger, TabsContent | ✅ 완성 |

### 3.2 공통 컴포넌트 (`/components/common/`)

| 컴포넌트 | 파일 | 용도 |
|----------|------|------|
| **StatCard** | `StatCard.tsx` | KPI 카드 (라벨, 값, 아이콘, 서브텍스트, 로딩) |
| **TokenAmount** | `TokenAmount.tsx` | bigint 토큰 금액 포매팅 |

### 3.3 레이아웃 컴포넌트 (`/components/layout/`)

| 컴포넌트 | 파일 | 설명 |
|----------|------|------|
| **Sidebar** | `Sidebar.tsx` | 데스크탑 좌측 네비게이션 (w-60) |
| **Header** | `Header.tsx` | 상단 바 (h-14, sticky) |
| **MobileNav** | `MobileNav.tsx` | 모바일 드로어 |

### 3.4 기능 컴포넌트

| 컴포넌트 | 파일 | 설명 |
|----------|------|------|
| **PriceChart** | `/components/options/PriceChart.tsx` | Lightweight Charts 캔들스틱 |

---

## 4. 누락된 컴포넌트 (반드시 제작 필요)

### 4.1 즉시 필요

| 컴포넌트 | 용도 | 우선순위 |
|----------|------|----------|
| **TokenSelector** | 토큰 선택 모달 (현재 HTML `<select>` 사용 중) | 🔴 Critical |
| **Dialog/Modal** | 트랜잭션 확인, 설정, Trove 관리 | 🔴 Critical |
| **Tooltip** | 용어 설명, 데이터 호버 정보 | 🔴 Critical |
| **Skeleton** | 로딩 상태 (현재 단순 pulse만 사용) | 🟡 High |
| **Toast/Notification** | TX 성공/실패 알림 | 🟡 High |
| **Progress** | 트랜잭션 진행, 라운드 타이머 | 🟡 High |
| **Slider** | 금액 조절, 슬리피지 설정 | 🟡 High |

### 4.2 향후 필요

| 컴포넌트 | 용도 |
|----------|------|
| **Select/Dropdown** | 필터, 정렬, 옵션 선택 |
| **Popover** | 세부 정보, 컨텍스트 메뉴 |
| **Sheet** | 모바일 바텀시트 |
| **Table** | 정렬 가능한 데이터 테이블 |
| **Accordion** | FAQ, 상세 설정 |
| **NumberInput** | +/- 버튼 포함 숫자 입력 |

---

## 5. 페이지별 디자인 개선 요청사항

### 5.1 홈 (`/`) — 랜딩 페이지

**현재:** 텍스트 + 5개 카드 그리드
**개선 방향:**
- 히어로 섹션에 브랜드 비주얼 추가 (눈 결정, 파티클 애니메이션 등)
- 실시간 프로토콜 통계 표시 (TVL, 거래량 등)
- 각 기능 카드에 일러스트/아이콘 개선
- 그라디언트 배경 + glassmorphism 카드
- CTA 버튼 강화 ("Start Trading" 등)

**참고:** Aave 랜딩 — 히어로 애니메이션 + 한눈에 보이는 프로토콜 요약

### 5.2 Swap (`/swap`)

**현재 레이아웃:**
```
┌─────────────────────────────────┐
│  Swap                   ⚙️      │
├─────────────────────────────────┤
│  From          Balance: 12.34   │
│  ┌─────────────────┐ ┌──────┐  │
│  │ 0.0             │ │wCTC ▼│  │
│  └─────────────────┘ └──────┘  │
│                                 │
│            ↕ (flip)             │
│                                 │
│  To            Balance: 56.78   │
│  ┌─────────────────┐ ┌──────┐  │
│  │ 0.0 (읽기전용)   │ │sbUSD▼│  │
│  └─────────────────┘ └──────┘  │
│                                 │
│  Fee               0.3% Badge  │
│                                 │
│  ┌─────────────────────────┐    │
│  │       [ Swap ]          │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

**개선 요청:**
1. **TokenSelector 모달** — HTML `<select>` 제거 → 토큰 로고/심볼/잔고 표시 모달
2. **토큰 로고** — 각 토큰별 아이콘 (wCTC, sbUSD, lstCTC, USDC)
3. **가격 영향 표시** — 큰 주문 시 Price Impact 경고 (빨간 텍스트)
4. **슬리피지 설정 팝업** — 설정 아이콘 클릭 시 (0.1%, 0.5%, 1%, 커스텀)
5. **트랜잭션 미리보기** — 스왑 전 확인 모달 (환율, 수수료, 최소 수령액)
6. **성공/실패 토스트** — 하단 알림
7. **Flip 버튼 애니메이션** — 더 부드러운 회전 (spring 애니메이션)

**참고:** Uniswap V4 — 깔끔한 스왑 카드, Jupiter — 가격 비교 표시

### 5.3 Pool (`/pool`, `/pool/add`)

**현재:** 기본 그리드 테이블
**개선 방향:**
- 풀 카드에 토큰 페어 로고 (겹치는 원형 아이콘)
- TVL, 24h 볼륨, APR 컬럼 추가
- 풀 검색/필터 기능
- 유동성 추가 페이지에 가격 차트 통합
- 틱 범위를 시각적으로 표시 (가격 분포 차트 위에 슬라이더)
- 예상 APR 계산 표시

**참고:** Uniswap V4 — 가격 범위 시각화, Drift — 포지션 카드

### 5.4 Lend (`/lend`)

**현재:** 기본 테이블 레이아웃
**개선 방향:**
- 마켓 카드 뷰 옵션 추가 (테이블/그리드 토글)
- Utilization Bar (시각적 사용률 바)
- APY/APR에 추세 아이콘 (↑↓)
- 마켓 상세 페이지 구현 (Supply/Borrow 패널)
- 포지션 카드: Health Factor 게이지, 청산가 표시

**참고:** Morpho Blue UI — 마켓 필터 + 유연한 선택, Aave — 대시보드형 포지션 관리

### 5.5 Borrow (`/borrow`)

**현재:** 통계 카드 + 빈 Trove 리스트
**개선 방향:**
- **Trove 카드 디자인** — CR 게이지 (반원형), 담보/부채 비율 시각화
- **Trove 열기 모달** — 담보 입력 → CR 슬라이더 → 이자율 설정
- **Trove 조정 모달** — 담보 추가/제거, 부채 상환/추가
- **CR 시각화** — 색상 코딩 (빨강 < 110%, 노랑 < 150%, 초록 > 200%)
- **청산 경고** — TCR 저하 시 알림 배너

### 5.6 Earn (`/earn`)

**현재:** 기본 예치/출금 폼
**개선 방향:**
- 풀 TVL 트렌드 미니 차트
- 예상 수익 계산기
- 담보 gain 내역 (테이블)
- 예치/출금 비율 시각화
- 성공 후 Confetti 또는 체크마크 애니메이션

### 5.7 Options (`/options`)

**현재 레이아웃:**
```
┌──────────────────────────────────────────────┐
│ Stats: BTC Price | Round | Time Left | Balance│
├──────────────────────┬───────────────────────┤
│                      │  Deposit              │
│  BTC/USD 차트        │  ┌──────┐ [Deposit]   │
│  (Lightweight Charts)│  └──────┘             │
│                      │                       │
│                      │  Place Order           │
│                      │  Round Info            │
│                      │  ┌─────┐ ┌─────┐      │
│                      │  │Over │ │Under│      │
│                      │  └─────┘ └─────┘      │
│                      │  ┌──────────────┐     │
│                      │  │ Amount       │     │
│                      │  └──────────────┘     │
│                      │  [ Bet Over ]         │
└──────────────────────┴───────────────────────┘
```

**개선 방향:**
1. **차트 강화** — TradingView 스타일 시간 프레임 선택, 볼륨 바, 마커(라운드 시작/종료)
2. **Over/Under 버튼** — 더 극적인 시각 (그라디언트, 아이콘, 확률 표시)
3. **라운드 타이머** — 원형 프로그레스 바 (카운트다운)
4. **풀 비율 바** — Over vs Under 비율 시각화 (가로 바)
5. **배당률 표시** — 현재 풀 비율 기반 예상 배당률
6. **성공 애니메이션** — 라운드 종료 시 결과 표시 (승리 시 글로우, 패배 시 그레이아웃)
7. **오더북 뷰** — 현재 주문 대기열 표시

**참고:** Hyperliquid — CEX급 트레이딩 UI, GMX — 레버리지 포지션 카드

### 5.8 Dashboard (`/dashboard`)

**현재:** 잔고 카드 + 퀵 링크
**개선 방향:**
- 포트폴리오 도넛 차트 (자산 분배)
- 포지션 요약 카드 (각 프로토콜별 PnL)
- 최근 트랜잭션 리스트
- 자산 가격 변동 (24h %) 표시
- 전체 포트폴리오 가치 히어로 숫자

**참고:** Aave — 로그인 후 대시보드, Drift — 실시간 PnL 오버레이

### 5.9 Analytics (`/analytics`)

**현재:** 완전 플레이스홀더
**개선 방향:**
- TVL/Volume 라인 차트 (Recharts)
- Top Pools 테이블 (APR, TVL, Volume)
- 토큰 가격 그리드
- 프로토콜별 TVL 파이 차트
- 시간 범위 선택 (24h, 7d, 30d, All)

### 5.10 Chat (`/chat`)

**현재:** 기본 채팅 버블
**개선 방향:**
- 마크다운 렌더링 (코드 블록, 리스트, 링크)
- 퀵 액션 버튼 (잔고 조회, 포지션 확인 등)
- 타이핑 인디케이터 (3dot bounce)
- 메시지 복사 버튼
- 다크 테마에 맞는 코드 하이라이트

---

## 6. 글로벌 디자인 개선 사항

### 6.1 Glassmorphism 도입

```css
/* 카드에 적용할 글래스 효과 */
.glass-card {
  background: rgba(20, 21, 37, 0.6);     /* bg-card 60% */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(96, 165, 250, 0.1); /* ice 10% */
}
```

**적용 위치:** 스왑 카드, 모달, 사이드바, 드롭다운

### 6.2 마이크로 인터랙션

| 요소 | 현재 | 개선 |
|------|------|------|
| 버튼 클릭 | scale 없음 | `active:scale-[0.98]` + 0.1s ease |
| 카드 호버 | border color 변경 | `translateY(-2px)` + shadow 증가 |
| 숫자 변경 | 즉시 변경 | 숫자 카운트업 애니메이션 |
| 탭 전환 | 즉시 | sliding underline indicator |
| 토글 | 없음 | smooth spring transition |
| 로딩 | spinner만 | 스켈레톤 + shimmer 효과 |
| TX 성공 | console.log | 토스트 + 체크마크 lottie |
| TX 실패 | console.error | 토스트 + shake animation |

### 6.3 토큰 로고 시스템

4개 토큰의 로고가 필요합니다:

| 토큰 | 용도 | 제안 스타일 |
|------|------|-------------|
| **tCTC/wCTC** | 네이티브 + 래핑된 토큰 | Creditcoin 로고 기반 |
| **lstCTC** | 스테이킹 토큰 | CTC + 스테이킹 아이콘 |
| **sbUSD** | 스테이블코인 | Snowball + $ 심볼 |
| **USDC** | 목 USDC | USDC 공식 로고 |

**배치:** `/public/tokens/wCTC.svg`, `/public/tokens/sbUSD.svg` 등

### 6.4 반응형 개선

| 뷰포트 | 현재 | 개선 필요 |
|--------|------|-----------|
| Mobile (<640px) | 사이드바 숨김, 일부 컬럼 숨김 | 바텀 탭 네비게이션, 카드 스택 |
| Tablet (640-1024px) | 사이드바 숨김 | 축소형 사이드바 (아이콘만) |
| Desktop (>1024px) | 전체 사이드바 | ✅ 현재 OK |

### 6.5 접근성

- [ ] 모든 인터랙티브 요소에 `aria-label` 추가
- [ ] 아이콘 전용 버튼에 `sr-only` 텍스트
- [ ] 컬러만으로 상태 구분하지 않기 (아이콘/텍스트 병행)
- [ ] 키보드 네비게이션 지원
- [ ] 글래스 효과에서 텍스트 대비 유지 (WCAG AA)

---

## 7. 디자인 레퍼런스

### 7.1 벤치마크 앱

| 앱 | 참고 포인트 | URL |
|----|------------|-----|
| **Aave** | 대시보드 UX, 브랜드 히어로 애니메이션 | aave.com |
| **Jupiter** | 깔끔한 스왑 UI, 가격 비교 | jup.ag |
| **Drift** | 다크 모드 + 글로우, 트레이딩 UI | drift.trade |
| **Uniswap V4** | 풀 관리 UI, 가격 범위 시각화 | app.uniswap.org |
| **Hyperliquid** | CEX급 오더북 UI | app.hyperliquid.xyz |
| **Morpho** | 렌딩 마켓 필터 UI | app.morpho.org |
| **Pendle** | 수익률 시각화 | app.pendle.finance |

### 7.2 디자인 트렌드 (2025-2026)

1. **Glassmorphism** — 반투명 표면 + backdrop blur (Apple Liquid Glass 영감)
2. **Micro-interactions** — 의미 있는 모션 (인지 부하 감소)
3. **Dark + Vibrant Accents** — 다크 배경 + 밝은 악센트 (DeFi 표준)
4. **Progressive Disclosure** — 핵심 먼저, 상세는 필요 시 노출
5. **Real-time Feedback** — 실시간 가스비, TX 상태, 가격 변동

---

## 8. 파일 구조

```
packages/frontend/src/
├── app/
│   ├── layout.tsx              # 루트 레이아웃 (Sidebar + Header)
│   ├── globals.css             # 디자인 토큰 (@theme 블록)
│   ├── page.tsx                # 홈
│   ├── (trade)/
│   │   ├── swap/page.tsx       # 스왑
│   │   └── pool/
│   │       ├── page.tsx        # 풀 목록
│   │       └── add/page.tsx    # 유동성 추가
│   ├── (defi)/
│   │   ├── lend/page.tsx       # 렌딩
│   │   ├── borrow/page.tsx     # 대출
│   │   └── earn/page.tsx       # 수익
│   ├── (options)/options/
│   │   ├── page.tsx            # 옵션 트레이딩
│   │   └── history/page.tsx    # 거래 이력
│   └── (more)/
│       ├── dashboard/page.tsx  # 대시보드
│       ├── analytics/page.tsx  # 분석
│       ├── agent/page.tsx      # 에이전트
│       └── chat/page.tsx       # 채팅
├── components/
│   ├── ui/                     # 기본 UI (Button, Card, Input, Badge, Tabs)
│   ├── common/                 # 공통 (StatCard, TokenAmount)
│   ├── layout/                 # 레이아웃 (Sidebar, Header, MobileNav)
│   └── options/                # PriceChart
├── hooks/
│   ├── trade/                  # useSwap, usePool, useAddLiquidity
│   ├── defi/                   # useLendMarkets
│   └── options/                # useOptions, useOptionsPrice
├── config/                     # chain, addresses, wagmi
├── abis/                       # dex, lend, liquity, options
└── lib/                        # utils, lendMath
```

---

## 9. 작업 우선순위

### Phase 1: 핵심 컴포넌트 (Week 1)

1. TokenSelector 모달 (토큰 로고 포함)
2. Dialog/Modal 컴포넌트
3. Toast/Notification 시스템
4. Tooltip 컴포넌트
5. Skeleton 로딩 패턴
6. 토큰 로고 SVG 에셋 제작

### Phase 2: 핵심 페이지 디자인 (Week 2)

1. Swap 페이지 폴리싱 (슬리피지 설정, TX 미리보기, 토큰 셀렉터)
2. Options 트레이딩 페이지 (타이머, 풀 비율, 배당률)
3. Dashboard 포트폴리오 뷰
4. 글로벌 마이크로 인터랙션 적용

### Phase 3: 서브 페이지 & 폴리싱 (Week 3)

1. Borrow — Trove 관리 UI (열기/조정/닫기 모달)
2. Lend — 마켓 상세 + 포지션 관리
3. Pool — 가격 범위 시각화
4. 반응형 최적화 (모바일 바텀 탭)

### Phase 4: 프리미엄 경험 (Week 4)

1. 랜딩 페이지 히어로 애니메이션
2. Analytics 차트 구현
3. Glassmorphism 카드 적용
4. 트랜지션 & 애니메이션 폴리싱
5. 접근성 감사 & 수정

---

## 10. 실행 시 참고사항

### 로컬 실행

```bash
cd packages/frontend
pnpm install
pnpm dev          # http://localhost:3000
```

### 환경변수 (`.env.local`)

```env
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
NEXT_PUBLIC_API_BASE=http://localhost:8000
NEXT_PUBLIC_CHAT_API_BASE=http://localhost:3002/api
```

### 빌드 확인

```bash
pnpm build        # 14개 라우트 전부 성공해야 함
```

### 디자인 작업 시 팁

- **globals.css의 `@theme` 블록**에 모든 디자인 토큰 정의됨 — 여기서 색상/폰트/애니메이션 수정
- **shadcn/ui 패턴** 유지 — Radix UI 프리미티브 + CVA variants
- **Tailwind 4 CSS-first** 방식 — `tailwind.config.ts` 파일 없음, 모든 설정은 CSS에서
- 새 컴포넌트 추가 시 `/components/ui/` 에 생성하고 Radix UI 사용 권장
- 커스텀 훅은 건드리지 않아도 됨 (기능 로직은 완성 상태)

---

> **문의:** 코드 구조, 훅 인터페이스, 컨트랙트 연동에 대한 질문은 백엔드/스마트컨트랙트 담당자에게 문의
