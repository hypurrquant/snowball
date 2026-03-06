# 작업 티켓 - v0.2.1

## 전체 현황

| # | Step | 난이도 | 롤백 | Scope | FP/FN | 개발 | 완료일 |
|---|------|--------|------|-------|-------|------|--------|
| 01 | [force-dynamic 제거](step-01-force-dynamic.md) | 🟢 | ✅ | ✅ | ✅ | ⏳ | - |
| 02 | [네비 공유 상수 추출](step-02-nav-shared.md) | 🟡 | ✅ | ✅ | ✅ | ⏳ | - |
| 03 | [useYieldVaults 네임드 매핑](step-03-yield-vaults.md) | 🟠 | ✅ | ✅ | ✅ | ⏳ | - |
| 04 | [WS 재연결](step-04-ws-reconnect.md) | 🟠 | ✅ | ✅ | ✅ | ⏳ | - |
| 05 | [색상 토큰 통일](step-05-color-tokens.md) | 🟡 | ✅ | ✅ | ✅ | ⏳ | - |

## 의존성

```
01 ─┐
02 ─┤
03 ─┼─ (모두 독립, 병렬 실행 가능)
04 ─┤
05 ─┘
```

5개 이슈는 서로 독립적이며 의존 관계 없음. 순서는 리스크 최소화 기준 (단순→복잡).

## 커버리지 매트릭스

### PRD 목표 → 티켓

| PRD 목표 | 관련 티켓 | 커버 |
|----------|----------|------|
| force-dynamic 루트 레이아웃 제거 | Step 01 | ✅ |
| Sidebar/MobileNav 네비 중복 해소 + Yield 누락 | Step 02 | ✅ |
| useYieldVaults 오프셋 계산 취약 수정 | Step 03 | ✅ |
| useOptionsPrice WS 재연결 없음 수정 | Step 04 | ✅ |
| 색상 하드코딩 불일치 통일 | Step 05 | ✅ |

### DoD → 티켓

| DoD 항목 | 설명 | 관련 티켓 | 커버 |
|----------|------|----------|------|
| F1 | force-dynamic 제거 | Step 01 | ✅ |
| F2 | nav.tsx + NAV_GROUPS export | Step 02 | ✅ |
| F3 | Sidebar/MobileNav NAV_GROUPS import | Step 02 | ✅ |
| F4 | MobileNav Yield 항목 렌더링 | Step 02 | ✅ |
| F5 | useYieldVaults 오프셋 제거 + 네임드 맵 | Step 03 | ✅ |
| F6 | WS 재연결 3회 exponential backoff | Step 04 | ✅ |
| F7 | WS 3회 실패 후 polling fallback | Step 04 | ✅ |
| F8 | 빈 catch → console.warn | Step 04 | ✅ |
| F9 | hex → Tailwind 토큰 치환 | Step 05 | ✅ |
| N1 | tsc --noEmit 성공 | Step 01, 02, 03, 04, 05 (각 Step 완료 조건에 명시) | ✅ |
| N2 | eslint 통과 | Step 05 완료 조건에 `npx eslint .` 명시 | ✅ |
| N3 | next build 성공 | Step 01, 05 완료 조건에 명시 | ✅ |
| N4 | 시각적 회귀 없음 | Step 05 완료 조건 (globals.css 값 불변 + hydration 스모크 체크) | ✅ |
| E1 | force-dynamic 개별 페이지 추가 | Step 01 | ✅ |
| E2 | gradient opacity 변형 치환 | Step 05 | ✅ |
| E3 | WS 완전 다운 시 polling 전환 | Step 04 | ✅ |
| E4 | address undefined 시 userShares 스킵 | Step 03 | ✅ |

### 설계 결정 → 티켓

| 설계 결정 | 관련 티켓 | 커버 |
|----------|----------|------|
| force-dynamic 루트 제거, 필요시 개별 추가 | Step 01 | ✅ |
| 공유 상수 nav.tsx + iconClassName 파라미터 | Step 02 | ✅ |
| flatMap 유지 + 네임드 인덱스 맵 빌드 | Step 03 | ✅ |
| 직접 구현 backoff + polling fallback (외부 의존 없음) | Step 04 | ✅ |
| hex → 기존 CSS 변수 클래스 전부 치환 | Step 05 | ✅ |
| 빈 catch → console.warn | Step 04 | ✅ |

## Step 상세
- [Step 01: force-dynamic 제거](step-01-force-dynamic.md)
- [Step 02: 네비 공유 상수 추출](step-02-nav-shared.md)
- [Step 03: useYieldVaults 네임드 매핑](step-03-yield-vaults.md)
- [Step 04: WS 재연결](step-04-ws-reconnect.md)
- [Step 05: 색상 토큰 통일](step-05-color-tokens.md)
