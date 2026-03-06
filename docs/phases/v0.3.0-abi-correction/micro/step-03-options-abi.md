# Step 03: options.ts ABI 교정 + useOptions.ts + options/page.tsx 동기화

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅
- **선행 조건**: 없음 (Step 01, 02와 독립)

---

## 1. 구현 내용 (design.md 기반)

### options.ts 수정

| 조치 | 대상 | 변경 내용 |
|------|------|----------|
| 수정 | `OptionsClearingHouseABI` | `deposit(uint256)` → `deposit()` payable |
| 수정 | `OptionsVaultABI` | `deposit(uint256)` → `deposit()` payable |
| 추가 | `OptionsVaultABI` | `pendingWithdrawShares(address)`, `withdrawUnlockTime(address)`, `availableLiquidity()` |
| 수정 | `SnowballOptionsABI` | `currentRound` → `currentRoundId` |
| 수정 | `SnowballOptionsABI` | `rounds(uint256)` → `getRound(uint256)` + 반환 구조를 Round struct tuple로 변경 |
| 추가 | `SnowballOptionsABI` | `getOrder(uint256,uint256)`, `paused()` |
| 수정 | `SnowballOptionsABI` | `RoundStarted` event 시그니처 교정 |
| 수정 | `SnowballOptionsABI` | `OrderSettled` event 시그니처 교정 |
| 신규 | `OptionsRelayerABI` | `DOMAIN_SEPARATOR()`, `nonces(address)`, `ORDER_TYPEHASH()` |

### useOptions.ts 동기화

| 변경 | 내용 |
|------|------|
| 함수명 | `currentRound` → `currentRoundId` |
| 함수명 | `rounds` → `getRound` |
| Dead import | `OptionsVaultABI` import 제거 (useOptions에서 미사용) |

### options/page.tsx 동기화

| 변경 | 내용 |
|------|------|
| deposit 호출 | `args: [amount]` 제거 → 인자 없는 payable, `value`로 CTC 전송 |

### Round struct 정의

`packages/options/src/SnowballOptions.sol`에서 확인 필요:

```solidity
struct Round {
    uint256 startTime;
    uint256 lockTime;
    uint256 endTime;
    uint256 strikePrice;
    uint256 settlementPrice;
    bool settled;
}
```

## 2. 완료 조건

- [ ] `options.ts`의 `OptionsClearingHouseABI`에 `deposit()` payable (인자 없음)
- [ ] `options.ts`의 `OptionsVaultABI`에 `deposit()` payable (인자 없음)
- [ ] `options.ts`의 `OptionsVaultABI`에 `pendingWithdrawShares`, `withdrawUnlockTime`, `availableLiquidity` 존재
- [ ] `options.ts`의 `SnowballOptionsABI`에 `currentRoundId(view, returns uint256)` 존재
- [ ] `options.ts`의 `SnowballOptionsABI`에 `currentRound` 없음
- [ ] `options.ts`의 `SnowballOptionsABI`에 `getRound(uint256)` 존재, Round struct tuple 반환
- [ ] `options.ts`의 `SnowballOptionsABI`에 `rounds` 없음
- [ ] `options.ts`의 `SnowballOptionsABI`에 `getOrder`, `paused` 존재
- [ ] `options.ts`의 `RoundStarted`, `OrderSettled` event 시그니처가 소스와 일치
- [ ] `options.ts`에 `OptionsRelayerABI` export 존재 (`DOMAIN_SEPARATOR`, `nonces`, `ORDER_TYPEHASH`)
- [ ] `useOptions.ts`에서 `currentRoundId` 호출
- [ ] `useOptions.ts`에서 `getRound` 호출
- [ ] `useOptions.ts`에 `OptionsVaultABI` import 없음
- [ ] `options/page.tsx`에서 `deposit()` 호출 시 args 없음 (value로 CTC 전송)

## 3. 롤백 방법
- `git checkout -- apps/web/src/abis/options.ts apps/web/src/hooks/options/useOptions.ts apps/web/src/app/\(options\)/options/page.tsx`
- 영향 범위: Options 페이지 전체

---

## Scope

### 수정 대상 파일
```
apps/web/src/
├── abis/options.ts                     # 수정 - 6개 수정 + 6개 추가 + OptionsRelayerABI 신규
├── hooks/options/useOptions.ts         # 수정 - 함수명 2개 변경 + dead import 1개 제거
└── app/(options)/options/page.tsx      # 수정 - deposit 호출 인자 제거
```

### 참조 파일 (읽기 전용)
```
packages/options/src/
├── SnowballOptions.sol         # currentRoundId, getRound, Round struct, events
├── OptionsClearingHouse.sol    # deposit() payable 시그니처
├── OptionsVault.sol            # deposit() payable, pendingWithdrawShares 등
└── OptionsRelayer.sol          # DOMAIN_SEPARATOR, nonces, ORDER_TYPEHASH
```

### Side Effect 위험
- `getRound` 반환 struct 필드 순서가 Solidity 정의와 다르면 디코딩 실패 → SnowballOptions.sol Round struct 직접 참조
- `deposit()` payable 전환 시 `options/page.tsx`의 `writeContract`에서 `value` 파라미터 사용 확인 필요

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| options.ts | design.md options.ts 섹션 | ✅ OK |
| useOptions.ts | design.md 호출부 동기화 | ✅ OK |
| options/page.tsx | design.md 호출부 동기화 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| deposit() payable 변경 | ✅ options.ts + page.tsx | OK |
| currentRoundId/getRound 변경 | ✅ options.ts + useOptions.ts | OK |
| OptionsRelayerABI 신규 | ✅ options.ts | OK |
| Event 시그니처 교정 | ✅ options.ts | OK |
| OptionsVaultABI dead import | ✅ useOptions.ts | OK |

### 검증 통과: ✅

---

→ 다음: [Step 04: dex.ts ABI 추가](step-04-dex-abi.md)
