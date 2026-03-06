# Step 02: index.ts re-export + addresses.ts 정리

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: ✅ (git revert)
- **선행 조건**: Step 01 (dex.ts export 이름 변경)

---

## 1. 구현 내용 (design.md 기반)

### index.ts
- `SnowballFactoryABI` → `UniswapV3FactoryABI` re-export
- `SnowballPoolABI` → `UniswapV3PoolABI` re-export
- `SnowballRouterABI` → `SwapRouterABI` re-export
- `DynamicFeePluginABI` re-export 제거
- `QuoterV2ABI`, `NonfungiblePositionManagerABI`, `MockERC20ABI` 유지

### addresses.ts
- 주석: `"Algebra V4 Integral"` → `"Uniswap V3"`
- `snowballFactory` → `factory`
- `snowballRouter` → `swapRouter`
- `snowballPoolDeployer` 필드 삭제
- `dynamicFeePlugin` 필드 삭제
- 주소 값은 변경하지 않음

## 2. 완료 조건
- [ ] index.ts에 `UniswapV3FactoryABI`, `UniswapV3PoolABI`, `SwapRouterABI` re-export (F10)
- [ ] index.ts에 `DynamicFeePlugin`, `Snowball` 관련 re-export 없음 (F10)
- [ ] addresses.ts에서 `snowballPoolDeployer`, `dynamicFeePlugin` 없음 (F11)
- [ ] addresses.ts에서 `snowballFactory`, `snowballRouter` 없음, `factory`, `swapRouter` 존재 (F12)
- [ ] addresses.ts 주석에 `"Uniswap V3"` 포함 (F13)
- [ ] 주소 값 변경 없음 (F24)

## 3. 롤백 방법
- `git checkout -- apps/web/src/abis/index.ts apps/web/src/config/addresses.ts`
- 영향 범위: 2개 파일

---

## Scope

### 수정 대상 파일
```
apps/web/src/
├── abis/index.ts      # re-export 이름 변경 + DynamicFeePlugin 제거
└── config/addresses.ts # DEX 섹션 필드명 변경 + 필드 삭제
```

### 신규 생성 파일
없음

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| hooks/trade/*.ts | 간접 영향 | `@/abis`에서 import, `DEX.snowballFactory` 등 참조 — Step 03에서 수정 |

### Side Effect 위험
- addresses.ts 필드명 변경 후 hooks에서 `DEX.snowballFactory` 등 참조 에러 → Step 03에서 해결

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| index.ts | ABI re-export 변경 | ✅ OK |
| addresses.ts | DEX 필드 변경 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| index.ts export 변경 | ✅ | OK |
| addresses.ts 필드 변경 | ✅ | OK |
| addresses.ts 주석 변경 | ✅ | OK |
| addresses.ts 필드 삭제 | ✅ | OK |

### 검증 통과: ✅

---

→ 다음: [Step 03: hooks 마이그레이션](step-03-hooks-migration.md)
