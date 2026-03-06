# Step 04: Liquity 라우트

## 메타데이터
- **난이도**: 🔴 어려움
- **롤백 가능**: ✅ (파일 추가만)
- **선행 조건**: Step 02 (Liquity hooks)

---

## 1. 구현 내용 (design.md 기반)
- `app/(defi)/liquity/layout.tsx`: 브랜치 셀렉터(wCTC/lstCTC, URL `?branch=` 파라미터) + [Borrow | Earn] 탭 네비게이션
- `app/(defi)/liquity/page.tsx`: `redirect('/liquity/borrow')`
- `app/(defi)/liquity/borrow/page.tsx`: 트로브 대시보드 — 브랜치 통계(StatCard 4개), 트로브 목록, Open/Adjust/Close/AdjustRate 다이얼로그, fixture 데모 데이터 통합
- `app/(defi)/liquity/earn/page.tsx`: SP 페이지 — 풀 통계(StatCard 3개), Deposit/Withdraw/Claim UI

## 2. 완료 조건
- [ ] `/liquity` 접속 → `/liquity/borrow`로 redirect
- [ ] `/liquity/borrow` 렌더링: 브랜치 셀렉터 + 4개 StatCard + 트로브 목록
- [ ] `/liquity/earn` 렌더링: 풀 통계 + Deposit/Withdraw/Claim
- [ ] layout에 [Borrow | Earn] 탭 네비, Earn 탭 클릭 → `/liquity/earn` 이동
- [ ] 브랜치 전환 시 URL `?branch=wCTC` / `?branch=lstCTC` 변경 + 데이터 갱신
- [ ] 지갑 미연결 시 WRITE 버튼 disabled + "Connect Wallet" 안내 텍스트
- [ ] 트로브 0개 시 "Open Trove" CTA만 표시, Adjust/Close 미노출
- [ ] openTrove: 담보+차입+금리 입력 → approve → 트로브 생성 → 목록 갱신
- [ ] adjustTrove, adjustInterestRate, closeTrove 다이얼로그 + WRITE 연결
- [ ] SP deposit/withdraw/claim WRITE 연결
- [ ] WRITE 실패 시 catch 블록에서 `toast.error(...)` 호출 코드 존재 (Toaster 마운트는 Step 06)
- [ ] `NEXT_PUBLIC_TEST_MODE=true` 시 fixture 트로브 `[Demo]` 라벨 표시, WRITE CTA disabled
- [ ] 잔고 부족 시 Submit 버튼 disabled (클라이언트 검증)
- [ ] 페이지에 `useReadContract`/`useWriteContract` 직접 호출 없음 (훅만 사용)
- [ ] `cd apps/web && npx tsc --noEmit` 에러 0

## 3. 롤백 방법
- 추가된 파일 삭제
- 영향 범위: Step 06 (네비게이션 변경)에서 연결

---

## Scope

### 신규 생성 파일
```
apps/web/src/app/(defi)/liquity/
├── layout.tsx              # 신규 - 브랜치 셀렉터 + 탭 네비
├── page.tsx                # 신규 - redirect → /liquity/borrow
├── borrow/
│   └── page.tsx            # 신규 - 트로브 대시보드 + CRUD 다이얼로그
└── earn/
    └── page.tsx            # 신규 - SP 페이지
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| Step 02 산출물 (Liquity hooks) | 직접 import | useLiquityBranch, useTroves, useTroveActions, useStabilityPool |
| Step 01 산출물 (types) | import | TroveData, BranchStats, SPPosition |
| Step 02 fixtures | import | DEMO_TROVES (TEST_MODE 시) |
| `shared/hooks/useTokenBalance.ts` | import | 잔고 조회 (잔고 부족 검증) |
| `shared/providers.tsx` | import | IS_TEST_MODE |
| `shared/components/ui/*` | import | Card, Button, Dialog, Input, Tabs, StatCard |
| `shared/lib/utils.ts` | import | formatTokenAmount, formatNumber |
| `core/config/addresses.ts` | import | TOKENS (잔고 조회용) |
| next/navigation | import | redirect, useSearchParams, usePathname |
| sonner | import | toast (에러 피드백 — Toaster 마운트는 Step 06) |

### Side Effect 위험
- 없음 (신규 파일만, 기존 `/borrow`, `/earn` 미수정 — 삭제는 Step 06)

### 참고할 기존 패턴
- `app/(defi)/borrow/page.tsx`: 기존 Borrow 페이지 (추출 대상 UI)
- `app/(defi)/earn/page.tsx`: 기존 Earn 페이지 (추출 대상 UI)
- `domains/defi/yield/components/VaultActionDialog.tsx`: 다이얼로그 WRITE 패턴

## FP/FN 검증

### False Positive (과잉)
모든 파일이 구현 내용과 1:1 매핑 — FP 없음

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| E5 healthFactor 경고 | Morpho에만 해당 | ✅ OK (이 Step은 Liquity) |
| E8 모바일 네비게이션 | Step 06 범위 | ✅ OK |

### 검증 통과: ✅

---

→ 다음: [Step 05: Morpho 라우트](step-05-morpho-routes.md)
