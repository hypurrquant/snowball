# Step 01: ABI 확장 + Liquity/Morpho 타입·유틸리티

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (파일 추가/수정만)
- **선행 조건**: 없음

---

## 1. 구현 내용 (design.md 기반)
- `core/abis/liquity.ts`에 HintHelpersABI, SortedTrovesABI 추가
- `domains/defi/liquity/types.ts` 생성: TroveData, BranchStats, SPPosition 인터페이스
- `domains/defi/liquity/lib/liquityMath.ts` 생성: CR 계산, 청산가격, hint 유틸 (폴백 포함)
- `domains/defi/morpho/types.ts` 생성: MorphoMarket, MorphoPosition 인터페이스
- `domains/defi/morpho/lib/morphoMath.ts` 생성: lendMath.ts 마이그레이션 (기존 함수 이동)
- `domains/defi/morpho/lib/marketParams.ts` 생성: marketParams 튜플 생성 헬퍼

## 2. 완료 조건
- [ ] `core/abis/liquity.ts`에 `HintHelpersABI`, `SortedTrovesABI` export 존재
- [ ] `domains/defi/liquity/types.ts`에 `TroveData`, `BranchStats`, `SPPosition` 타입 export
- [ ] `domains/defi/liquity/lib/liquityMath.ts`에 hint 폴백 로직 포함 (catch → (0n,0n))
- [ ] `domains/defi/morpho/types.ts`에 `MorphoMarket`, `MorphoPosition` 타입 export
- [ ] `domains/defi/morpho/lib/morphoMath.ts`에 기존 `lendMath.ts`의 5개 함수 마이그레이션
- [ ] `domains/defi/morpho/lib/marketParams.ts`에 `getMarketParams()` 함수 export
- [ ] `cd apps/web && npx tsc --noEmit` 에러 0

## 3. 롤백 방법
- 추가된 파일 삭제 + `liquity.ts` ABI 변경 revert
- 영향 범위: 후속 Step만 (이 Step에서는 기존 코드 의존 없음)

---

## Scope

### 수정 대상 파일
```
apps/web/src/
└── core/abis/liquity.ts          # 수정 - HintHelpersABI, SortedTrovesABI 추가
```

### 신규 생성 파일
```
apps/web/src/
├── domains/defi/liquity/
│   ├── types.ts                   # 신규 - TroveData, BranchStats, SPPosition
│   └── lib/
│       └── liquityMath.ts         # 신규 - CR, 청산가격, hint 유틸
└── domains/defi/morpho/
    ├── types.ts                   # 신규 - MorphoMarket, MorphoPosition
    └── lib/
        ├── morphoMath.ts          # 신규 - lendMath.ts 마이그레이션
        └── marketParams.ts        # 신규 - getMarketParams()
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| `core/abis/liquity.ts` | 직접 수정 | 기존 export에 2개 ABI 추가 |
| `core/abis/index.ts` | 간접 확인 | re-export 패턴 확인 필요 |
| `domains/defi/lend/lib/lendMath.ts` | 참조 원본 | morphoMath로 함수 복사 (삭제는 Step 06) |
| `core/config/addresses.ts` | 참조 | LIQUITY.shared.hintHelpers, LEND 설정 import |

### Side Effect 위험
- 없음 (신규 파일 + ABI 추가만, 기존 import 깨지지 않음)

### 참고할 기존 패턴
- `domains/defi/lend/lib/lendMath.ts`: morphoMath 원본
- `core/abis/dex.ts`: ABI export 패턴

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| core/abis/liquity.ts 수정 | HintHelpers/SortedTroves ABI 추가 | ✅ OK |
| liquity/types.ts | design.md 훅 인터페이스 정의 | ✅ OK |
| liquity/lib/liquityMath.ts | hint 폴백 + CR 계산 | ✅ OK |
| morpho/types.ts | design.md 훅 인터페이스 정의 | ✅ OK |
| morpho/lib/morphoMath.ts | lendMath 마이그레이션 | ✅ OK |
| morpho/lib/marketParams.ts | design.md 기술 결정 5 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| core/abis/index.ts re-export 확인 | 간접 확인 | ✅ OK (기존 wildcard export) |

### 검증 통과: ✅

---

→ 다음: [Step 02: Liquity 도메인 훅](step-02-liquity-hooks.md)
