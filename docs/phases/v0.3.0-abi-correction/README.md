# ABI 전면 교정 - v0.3.0

## 범위
`apps/web/src/abis/` 5개 파일 + 해당 ABI를 사용하는 hooks/pages의 함수명 수정. 컨트랙트 소스 변경 없음.

## 문제 정의

### 현상

`apps/web/src/abis/` 의 ABI 정의가 실제 배포된 스마트 컨트랙트와 불일치하여 온체인 호출이 revert됨.

감사 결과 (`docs/report/abi-audit.md`):
- **CRITICAL 16건**: 함수 셀렉터 불일치 — 호출 시 revert
- **HIGH 7건**: 핵심 사용자 기능의 ABI 누락
- **MEDIUM 6건**: 타입 불일치 또는 부분 누락
- **Dead Import 4건**: import만 있고 호출 없는 코드

FP/FN 분석으로 **현재 실제 revert 중인 건 7건** 확인:

| # | 페이지 | 호출 함수 | 컨트랙트 실제 함수 |
|---|--------|----------|------------------|
| 1 | Borrow | `getEntireSystemColl()` | `getEntireBranchColl()` |
| 2 | Borrow | `getEntireSystemDebt()` | `getEntireBranchDebt()` |
| 3 | Borrow | `MockPriceFeed.getPrice()` | `lastGoodPrice()` |
| 4 | Lend | `MockOracle.getPrice()` | `price()` |
| 5 | Options | `ClearingHouse.deposit(uint256)` | `deposit()` payable |
| 6 | Options | `Options.currentRound()` | `currentRoundId()` |
| 7 | Options | `Options.rounds(uint256)` | `getRound(uint256)` |

Codex로 교차검증 완료 — 7건 전부 revert 확정.

### 원인

컨트랙트가 프로토타이핑 과정에서 리팩토링되었으나 (함수 이름 변경, 시그니처 변경, private 전환 등), 프론트엔드 ABI가 업데이트되지 않음.

구체적 원인:
- Liquity V2: `getEntireSystem*` → `getEntireBranch*` (Multi-branch 도입 시 이름 변경)
- Liquity V2: `getTroveEntireColl/Debt` → `getLatestTroveData()` 통합 (struct 반환으로 변경)
- Liquity V2: `tokenOfOwnerByIndex` → TroveNFT가 ERC721Enumerable이 아님
- Morpho: IOracle 인터페이스가 `price()` (not `getPrice()`)
- Options: `deposit()` payable → `deposit(uint256)` payable 시그니처 불일치
- Options: `_rounds` private mapping → auto-getter 없음, `getRound()` 함수 제공

### 영향

- **Borrow 페이지**: 시스템 담보/부채/가격 데이터 못 읽음 → 페이지 기능 마비
- **Lend 마켓**: 오라클 가격 못 읽음 → 마켓 정보 불완전
- **Options 페이지**: 입금 revert + 라운드 정보 못 읽음 → 기능 전면 마비

### 목표

1. **즉시 수정 (CRITICAL 16건)**: 잘못된 ABI 함수명·시그니처를 실제 컨트랙트에 맞게 교정
2. **누락 보완 (HIGH 7건 + MEDIUM 6건)**: 향후 필요한 핵심 함수 ABI 추가
3. **정리 (4건)**: Dead import 제거
4. **호출부 수정**: ABI 변경에 따른 hooks/pages의 함수명·파라미터 동기화

### 비목표 (Out of Scope)

- 새 페이지/기능 구현 (증가된 ABI를 사용하는 UI는 이후 Phase)
- 컨트랙트 소스 수정
- 테스트 코드 작성
- v0.2.1 범위의 코드 품질 개선 (별도 Phase)
- integration 패키지 (SnowballRouter 등) ABI 추가 — 해당 UI가 없으므로 이후 Phase

## 제약사항

- 기존 UI 동작이 유지되어야 함 (revert가 해소되면 데이터가 표시되기 시작)
- ABI는 컨트랙트 소스코드에서 직접 추출 — 추측 금지
- `pnpm build` (next build) 성공 필수
- `pnpm dev` 후 Borrow/Lend/Options 페이지에서 데이터 로딩 확인
