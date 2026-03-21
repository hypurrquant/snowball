# Ralplan Consensus Plan: Collapsible Sidebar Navigation

## ADR (Architecture Decision Record)

### Decision
사이드바를 **접이식 아이콘 레일**(기본 접힘 ~56px, 호버/클릭 시 펼침 240px)로 전환한다. 완전 제거하지 않는다.

### Drivers
1. 화면 공간 회복 (240px → 56px)
2. 파워유저 1클릭 접근성 유지
3. 16개 → 10개로 항목 정리 (통합/이동)
4. 기존 라우트 URL 변경 없음

### Alternatives Considered
| Option | Why Rejected |
|--------|-------------|
| A. 상단 탭 바 (4개) | 파워유저 2클릭 필요, 3단계 네비 위험, (defi) 라우트 그룹 대규모 재편 필요 |
| B. 사이드바 축소 (항목만 줄이기) | 240px 공간 여전히 차지 |

### Why Chosen
- 공간 효율 (56px 아이콘 레일)과 접근성 (호버로 전체 레이블)을 동시 달성
- 라우트 그룹 재편 불필요 — `(defi)` 그대로 유지 가능
- 기존 NAV_GROUPS 구조 그대로 사용
- 향후 프로토콜 추가 시 사이드바가 스크롤로 수용 (상단 탭은 수용 어려움)

### Consequences
- Sidebar.tsx 리팩토링 필요 (접이식 로직)
- 호버/클릭 인터랙션 구현
- 모바일은 기존 햄버거 메뉴 유지 (변경 없음)

---

## Implementation Plan

### Step 1: NAV_GROUPS 정리 (nav.tsx)
**16개 → 10개 항목**

```
EARN (3):     Supply (Strategy 통합) | Yield Vaults | LP Staking
BORROW (2):   CDP | Lending
TRADE (2):    Swap | Pool
MANAGE (3):   Dashboard (Analytics 통합) | Agent (Chat 통합) | Bridge
```

제거: Strategy (Supply에 흡수), Analytics (Dashboard에 흡수), Chat (Agent에 흡수), ForwardX (Pool에 흡수 또는 Trade 하위), Faucet (Dashboard 하단 링크)

**파일:** `apps/web/src/shared/config/nav.tsx`

### Step 2: Sidebar 접이식 전환 (Sidebar.tsx)
- 기본 상태: `w-14` (56px) 아이콘만 표시
- 호버 또는 핀 버튼 클릭: `w-60` (240px) 전체 레이블 + 아이콘
- 트랜지션: `transition-all duration-200`
- 접힌 상태: 그룹 타이틀 숨김, 아이콘만
- 펼친 상태: 현재와 동일
- 하단에 핀/언핀 토글 버튼

**파일:** `apps/web/src/shared/components/layout/Sidebar.tsx`

### Step 3: Root Layout 조정 (layout.tsx)
- Sidebar 너비 변경에 따라 main 영역 자동 확장 (flex-1 이미 적용됨)
- 변경 최소: Sidebar 컴포넌트 내부에서 처리

**파일:** `apps/web/src/app/layout.tsx` (변경 거의 없음)

### Step 4: MobileNav 그룹 헤딩 추가
- 현재 flatMap으로 그룹 정보 소실 → 그룹별 섹션 표시
- EARN/BORROW/TRADE/MANAGE 그룹 타이틀 추가

**파일:** `apps/web/src/shared/components/layout/MobileNav.tsx`

### Step 5: Faucet 이동
- 사이드바 하단 유틸리티 영역에 작게 배치 (아이콘만)
- 또는 Dashboard 페이지 내 링크

---

## Acceptance Criteria
- [ ] 사이드바 기본 접힘 (56px, 아이콘만)
- [ ] 마우스 호버 시 펼침 (240px, 아이콘 + 레이블)
- [ ] 핀 버튼으로 펼침 고정 가능
- [ ] NAV_GROUPS 10개 항목 (Strategy/Analytics/Chat/Faucet 제거)
- [ ] 접힌 상태에서도 현재 페이지 하이라이트 (아이콘 색상)
- [ ] 모바일: 기존 햄버거 메뉴 유지 + 그룹 헤딩 추가
- [ ] 기존 모든 라우트 URL 동작 유지
- [ ] 홈 페이지 Explore 카드 → 각 섹션 첫 페이지로 연결
- [ ] TypeScript 빌드 에러 없음

## Risk Mitigation
| Risk | Mitigation |
|------|-----------|
| 호버 인터랙션이 터치 디바이스에서 작동 안 함 | 모바일/태블릿은 기존 햄버거 메뉴 사용 (lg 브레이크포인트) |
| 접이식 트랜지션이 레이아웃 시프트 유발 | main 영역 flex-1이 자동 조정, 사이드바는 position: sticky |
| ForwardX 제거 시 사용자 혼란 | Pool 페이지에서 ForwardX 링크 유지 |

## Scope Summary
- **수정 파일 3개**: nav.tsx, Sidebar.tsx, MobileNav.tsx
- **최소 수정 1개**: layout.tsx (필요 시)
- **새 파일 0개**
- **라우트 변경 0개**
- **예상 작업량**: 중간 (Sidebar 접이식 로직이 핵심)
