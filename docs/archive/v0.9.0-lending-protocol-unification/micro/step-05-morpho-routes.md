# Step 05: Morpho 라우트

## 메타데이터
- **난이도**: 🔴 어려움
- **롤백 가능**: ✅ (파일 추가만)
- **선행 조건**: Step 03 (Morpho hooks)

---

## 1. 구현 내용 (design.md 기반)
- `app/(defi)/morpho/layout.tsx`: [Supply | Borrow] 탭 네비게이션
- `app/(defi)/morpho/page.tsx`: `redirect('/morpho/supply')`
- `app/(defi)/morpho/supply/page.tsx`: 마켓 대시보드 (마켓 카드 3개) + Supply/Withdraw 다이얼로그 + 유저 포지션 표시
- `app/(defi)/morpho/borrow/page.tsx`: 마켓 대시보드 (차입 관점) + SupplyCollateral/Borrow/Repay/WithdrawCollateral 다이얼로그 + 유저 포지션

## 2. 완료 조건
- [ ] `/morpho` 접속 → `/morpho/supply`로 redirect
- [ ] `/morpho/supply` 렌더링: 마켓 카드 3개 (이름, Supply APY, Borrow APR, 이용률 바)
- [ ] `/morpho/borrow` 렌더링: 마켓 카드 3개 (차입 관점 — LLTV, Available to borrow)
- [ ] layout에 [Supply | Borrow] 탭 네비, Borrow 탭 클릭 → `/morpho/borrow` 이동
- [ ] 지갑 연결 시 유저 포지션 표시: supplyAssets, borrowAssets, collateral, healthFactor
- [ ] supply: approve → supply → 포지션 갱신
- [ ] withdraw: 공급 출금 → 포지션 갱신
- [ ] supplyCollateral: approve → 담보 공급 → 포지션 갱신
- [ ] borrow: 차입 → 포지션 갱신
- [ ] repay: approve → 상환 → 포지션 갱신
- [ ] withdrawCollateral: 담보 출금 → 포지션 갱신
- [ ] 지갑 미연결 시 WRITE 버튼 disabled + "Connect Wallet" 안내
- [ ] borrow 시 healthFactor < 1 되는 금액 입력 → 경고 텍스트 + Submit disabled (E5)
- [ ] `NEXT_PUBLIC_TEST_MODE=true` 시 fixture 포지션 `[Demo]` 라벨 표시, WRITE CTA disabled
- [ ] WRITE 실패 시 catch 블록에서 `toast.error(...)` 호출 코드 존재 (Toaster 마운트는 Step 06)
- [ ] 페이지에 `useReadContract`/`useWriteContract` 직접 호출 없음 (훅만 사용)
- [ ] `cd apps/web && npx tsc --noEmit` 에러 0

## 3. 롤백 방법
- 추가된 파일 삭제
- 영향 범위: Step 06 (네비게이션 변경)에서 연결

---

## Scope

### 신규 생성 파일
```
apps/web/src/app/(defi)/morpho/
├── layout.tsx              # 신규 - [Supply | Borrow] 탭 네비
├── page.tsx                # 신규 - redirect → /morpho/supply
├── supply/
│   └── page.tsx            # 신규 - 마켓 + Supply/Withdraw 다이얼로그
└── borrow/
    └── page.tsx            # 신규 - 마켓 + Collateral/Borrow/Repay 다이얼로그
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| Step 03 산출물 (Morpho hooks) | 직접 import | useMorphoMarkets, useMorphoPosition, useMorphoActions |
| Step 01 산출물 (types) | import | MorphoMarket, MorphoPosition |
| Step 03 fixtures | import | DEMO_POSITIONS (TEST_MODE 시) |
| `shared/hooks/useTokenBalance.ts` | import | 잔고 조회 |
| `shared/providers.tsx` | import | IS_TEST_MODE |
| `shared/components/ui/*` | import | Card, Button, Dialog, Input, Tabs, StatCard |
| `shared/lib/utils.ts` | import | formatTokenAmount, formatNumber |
| `core/config/addresses.ts` | import | TOKENS, LEND.markets |
| next/navigation | import | redirect, usePathname |
| sonner | import | toast (에러 피드백 — Toaster 마운트는 Step 06) |

### Side Effect 위험
- 없음 (신규 파일만, 기존 `/lend` 미수정 — 삭제는 Step 06)

### 참고할 기존 패턴
- `app/(defi)/lend/page.tsx`: 기존 Lend 페이지 (마켓 카드 UI 참조)
- `domains/defi/yield/components/VaultActionDialog.tsx`: 다이얼로그 WRITE 패턴

## FP/FN 검증

### False Positive (과잉)
모든 파일이 구현 내용과 1:1 매핑 — FP 없음

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| E4 supply 후 즉시 withdraw | 기능 자체는 포함, 테스트는 수동 | ✅ OK |

### 검증 통과: ✅

---

→ 다음: [Step 06: 네비게이션 + 정리](step-06-nav-cleanup.md)
