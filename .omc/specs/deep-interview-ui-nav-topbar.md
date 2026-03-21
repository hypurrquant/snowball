# Deep Interview Spec: UI Navigation — Sidebar to Top Bar

## Metadata
- Interview ID: ui-nav-improvement-20260319
- Rounds: 6
- Final Ambiguity Score: 16.5%
- Type: brownfield
- Generated: 2026-03-19
- Threshold: 20%
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.90 | 35% | 0.315 |
| Constraint Clarity | 0.85 | 25% | 0.213 |
| Success Criteria | 0.75 | 25% | 0.188 |
| Context Clarity | 0.80 | 15% | 0.120 |
| **Total Clarity** | | | **0.835** |
| **Ambiguity** | | | **16.5%** |

## Goal

사이드바 네비게이션(16개 항목)을 제거하고, 최신 DeFi 프로토콜 트렌드에 맞는 **상단 탭 바(4개 메인 탭 + 서브 탭)** 구조로 전환한다. 홈 페이지(잔고 + Explore)와의 연결성을 강화하여 유저가 의도 기반으로 자연스럽게 탐색할 수 있게 한다.

## 최종 네비게이션 구조

### 상단 탭 바 (Header 통합)
```
❄ Snowball    Earn    Borrow    Trade    Dashboard    [Wallet]
```

### 메인 탭 → 서브 탭 매핑

| 메인 탭 | 서브 탭 | 기존 항목 통합 |
|---------|---------|---------------|
| **Earn** | Supply / Vaults / Staking | Supply + Strategy(통합) / Yield Vaults / LP Staking |
| **Borrow** | CDP / Lending | CDP(Liquity) / Lending(Morpho) |
| **Trade** | Swap / Pool / ForwardX | Swap / Pool / ForwardX |
| **Dashboard** | Portfolio / Agent / Bridge | Dashboard + Analytics(통합) / Agent + Chat(통합) / Bridge |

### 홈 페이지 (/)
- 잔고 표시 (wCTC, lstCTC, sbUSD, USDC)
- Explore 카드 4개 (Earn, Borrow, Trade, Manage) + Agent 풀 너비
- 온체인 이율 표시

### Faucet
- Dashboard 서브 탭으로 배치 또는 프로필 드롭다운

## 통합 상세

| 기존 | 통합 위치 | 방식 |
|------|----------|------|
| Strategy | Earn > Supply | Supply 페이지 내 탭/섹션으로 |
| Analytics | Dashboard > Portfolio | Portfolio 페이지에 차트/통계 통합 |
| Chat | Dashboard > Agent | Agent 페이지 내 Chat 탭 |
| ForwardX | Trade > ForwardX | Trade 서브 탭으로 이동 |
| Bridge | Dashboard > Bridge | Dashboard 서브 탭 |
| Faucet | Dashboard 하단 또는 프로필 | 자주 쓰지 않으므로 숨김 |

## Constraints
- 기존 라우트 URL은 최대한 유지 (SEO 및 북마크 호환)
- 서브 탭은 각 섹션 페이지의 레이아웃으로 구현 (Next.js layout.tsx 패턴)
- 모바일에서는 햄버거 메뉴로 전환
- 상단 바는 기존 Header 컴포넌트를 확장

## Non-Goals
- 각 페이지의 내부 UI 리디자인 (네비게이션만)
- 새 페이지 추가
- 라우트 URL 변경

## Acceptance Criteria
- [ ] 사이드바 컴포넌트 제거 (Sidebar.tsx)
- [ ] Header에 메인 탭 4개 (Earn, Borrow, Trade, Dashboard) 추가
- [ ] 각 메인 탭 클릭 시 해당 섹션으로 이동 + 서브 탭 표시
- [ ] Earn 레이아웃: Supply | Vaults | Staking 서브 탭
- [ ] Borrow 레이아웃: CDP | Lending 서브 탭
- [ ] Trade 레이아웃: Swap | Pool | ForwardX 서브 탭
- [ ] Dashboard 레이아웃: Portfolio | Agent | Bridge 서브 탭
- [ ] 홈 페이지 Explore 카드가 각 메인 탭으로 연결
- [ ] 모바일: 햄버거 메뉴로 동일 구조 접근 가능
- [ ] layout.tsx에서 Sidebar 제거, main 영역이 전체 너비 사용

## Technical Context

### 변경 대상 파일
- `apps/web/src/shared/components/layout/Sidebar.tsx` → 제거
- `apps/web/src/shared/components/layout/Header.tsx` → 메인 탭 추가
- `apps/web/src/app/layout.tsx` → Sidebar import 제거, 레이아웃 조정
- `apps/web/src/app/(earn)/layout.tsx` → 서브 탭 (Supply | Vaults | Staking)
- `apps/web/src/app/(defi)/layout.tsx` → Borrow 서브 탭 필요시
- `apps/web/src/app/(trade)/layout.tsx` → 서브 탭 (Swap | Pool | ForwardX)
- `apps/web/src/app/(more)/layout.tsx` → Dashboard 서브 탭

### 기존 라우트 → 새 탭 매핑
```
/earn/supply      → Earn > Supply
/earn/strategy    → Earn > Supply (탭 내 통합)
/yield            → Earn > Vaults
/stake            → Earn > Staking
/liquity/borrow   → Borrow > CDP
/morpho/supply    → Borrow > Lending (또는 Earn에서 접근)
/morpho/borrow    → Borrow > Lending
/swap             → Trade > Swap
/pool             → Trade > Pool
/forward          → Trade > ForwardX
/dashboard        → Dashboard > Portfolio
/agent            → Dashboard > Agent
/bridge           → Dashboard > Bridge
/analytics        → Dashboard > Portfolio (통합)
/chat             → Dashboard > Agent (통합)
/faucet           → Dashboard 하단 링크
```

## Interview Transcript
<details>
<summary>Full Q&A (6 rounds)</summary>

### Round 1
**Q:** UI 향상의 범위는?
**A:** 사이드바 + 홈 통합
**Ambiguity:** 69.2%

### Round 2
**Q:** 사이드바 정리 기준은?
**A:** 사용자 의도 기준 (Earn/Borrow/Trade)
**Ambiguity:** 56.5%

### Round 3
**Q:** 통합 방안 확인 (Strategy→Supply, Analytics→Dashboard 등)
**A:** 맞다 — 이대로 해
**Ambiguity:** 34.0%

### Round 4 (CONTRARIAN MODE)
**Q:** 사이드바가 꼭 필요한가? 최신 DeFi는 대부분 상단 탭.
**A:** 최신 디자인 트렌드 확인 요청 → 상단 탭 분석 제공
**Ambiguity:** 37.8%

### Round 5
**Q:** 상단 탭 바로 전환할까?
**A:** 상단 탭 바로 전환
**Ambiguity:** 27.8%

### Round 6 (SIMPLIFIER MODE)
**Q:** 최종 구조 확인 (4메인 탭 + 서브 탭)
**A:** 맞다 — 이대로
**Ambiguity:** 16.5%

</details>
