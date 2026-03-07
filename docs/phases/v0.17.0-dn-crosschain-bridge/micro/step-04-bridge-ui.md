# Step 04: Bridge UI + Page

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: O (파일 삭제)
- **선행 조건**: Step 03 (bridge hooks)

---

## 1. 구현 내용 (design.md 기반)

### 4-1. PipelineProgress (`domains/bridge/components/PipelineProgress.tsx`)
- 6단계 시각화 (approve → deposit → mint → burn → attestWait → done)
- 각 단계: 체인 이름 뱃지 + 상태(pending/executing/done/error)
- 체인 스위치 안내 (Step 2→3 사이)
- TX 해시 클릭 → 해당 체인 explorer 링크
- attestation 대기 중 타이머 + 지연 안내

### 4-2. ChainDashboard (`domains/bridge/components/ChainDashboard.tsx`)
- 3개 카드: CC Testnet USDC, Sepolia DN, USC Testnet DN
- 각 카드: 체인 이름 + 토큰 심볼 + 잔액 + 로딩 상태
- useMultiChainBalances 훅 연동

### 4-3. BridgePipelinePage (`domains/bridge/components/BridgePipelinePage.tsx`)
- PipelineProgress + ChainDashboard 조합
- 금액 입력 필드 (USDC amount)
- 시작 버튼 ("Bridge 시작")
- useBridgePipeline + useBridgeActions 연동

### 4-4. /bridge 라우트 (`app/(defi)/bridge/page.tsx`)
- BridgePipelinePage 렌더링
- 네비게이션에 Bridge 메뉴 추가 (`shared/config/nav.tsx`)

## 2. 완료 조건
- [ ] `/bridge` 접속 시 BridgePipelinePage 렌더링
- [ ] PipelineProgress가 6단계 표시
- [ ] ChainDashboard가 3개 체인 잔액 표시
- [ ] 금액 입력 + "Bridge 시작" 버튼 존재
- [ ] 네비게이션 메뉴에 "Bridge" 항목 존재
- [ ] 체인 스위치 거부 시 "Sepolia로 전환해주세요" 안내 표시 (E2 커버)
- [ ] Sepolia 미등록 지갑에서 스위치 시 wallet_addEthereumChain 프롬프트 표시 (E8 커버)
- [ ] `pnpm --filter @snowball/web exec tsc --noEmit` 통과
- [ ] `pnpm --filter @snowball/web lint` 통과 (N2)
- [ ] `pnpm --filter @snowball/web build` 성공 (N3)
- [ ] `/swap`, `/borrow`, `/lend` 페이지 접속 + 데이터 렌더링 확인 (N4)

## 3. 롤백 방법
- bridge 컴포넌트 파일 삭제 + nav.tsx 원복 + route 폴더 삭제

---

## Scope

### 신규 생성 파일
```
apps/web/src/domains/bridge/components/
├── BridgePipelinePage.tsx
├── PipelineProgress.tsx
└── ChainDashboard.tsx

apps/web/src/app/(defi)/bridge/
└── page.tsx
```

### 수정 대상 파일
```
apps/web/src/shared/config/nav.tsx    # 수정 - Bridge 메뉴 추가
```

### 참고할 기존 패턴
- `domains/defi/yield/components/VaultActionDialog.tsx`: TX pipeline + modal 패턴
- `shared/components/ui/tx-pipeline-modal.tsx`: 기존 pipeline 모달 UI
- `app/(defi)/liquity/borrow/page.tsx`: DeFi 라우트 구조

## FP/FN 검증

### False Positive (과잉)
없음

### False Negative (누락)
없음 — N2/N3/N4와 E2가 완료조건에 반영됨

### 검증 통과: O

---

> 다음: [Step 05: Contract Deployment + Worker Config](step-05-deploy.md)
