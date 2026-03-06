# Step 03: useYieldVaults 네임드 인덱스 맵

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅
- **선행 조건**: 없음
- **DoD 매핑**: F5, E4

---

## 1. 구현 내용 (design.md 기반)
- `callsPerVault` 상수 + 수동 `offset + N` 인덱싱 제거
- contracts 배열 빌드 시 각 vault별로 `indices[vaultIdx][field] = contracts.length` 형태로 인덱스 기록
- 결과 매핑을 `data?.[indices[i].tvl!]?.result` 형태로 변경
- `address` 유무에 따른 조건부 처리 유지 (userShares 콜 스킵)
- 반환 타입 `VaultData` 변경 없음 (backward compatible)

```ts
type FieldKey = "tvl" | "totalSupply" | "pricePerShare" | "userShares" | "lastHarvest" | "paused" | "withdrawFee";
const indices: Record<number, Partial<Record<FieldKey, number>>> = {};
```

## 2. 완료 조건
- [ ] `grep "callsPerVault\|offset +" apps/web/src/hooks/defi/useYieldVaults.ts` → 결과 없음
- [ ] `grep "indices\|indexMap\|Record<" apps/web/src/hooks/defi/useYieldVaults.ts` → 네임드 맵 존재
- [ ] address undefined 시 userShares 인덱스가 생성되지 않음: `grep -A2 "address" apps/web/src/hooks/defi/useYieldVaults.ts` → 조건부 분기 존재 (E4)
- [ ] `cd apps/web && npx tsc --noEmit` 성공 (N1)
- [ ] VaultData 인터페이스 변경 없음 (export 유지)

## 3. 롤백 방법
- 롤백 절차: git checkout으로 원래 오프셋 계산 복원
- 영향 범위: yield 페이지 vault 데이터 표시

---

## Scope

### 수정 대상 파일
```
apps/web/src/
└── hooks/defi/useYieldVaults.ts  # 수정 - contracts 빌드 + 결과 매핑 로직 전면 교체
```

### 신규 생성 파일
없음

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| useYieldVaults.ts | 직접 수정 | 내부 로직만 변경, 인터페이스 유지 |
| yield/page.tsx | 간접 영향 | `useYieldVaults()` 소비자 — 반환 타입 동일하므로 수정 불필요 |
| VaultCard.tsx | 간접 영향 | `VaultData` 타입 import — 타입 변경 없으므로 수정 불필요 |
| VaultActionDialog.tsx | 간접 영향 | `VaultData` 타입 import — 타입 변경 없으므로 수정 불필요 |

### Side Effect 위험
- 위험 1: 인덱스 매핑 오류 시 vault 데이터가 잘못된 필드에 할당됨
  - 대응: tsc 타입 체크 + 빌드 성공으로 1차 검증, 기존 동작과 동일한 결과 보장
- 위험 2: address undefined일 때 userShares 인덱스가 존재하지 않아야 함
  - 대응: `Partial<Record<FieldKey, number>>` 사용, address 없으면 userShares 키 미생성

### 참고할 기존 패턴
- 현재 `useYieldVaults.ts` lines 41-55: `callsPerVault = address ? 7 : 6` + `offset = i * callsPerVault`
- 현재 contracts 빌드: `YIELD.vaults.flatMap()` + 조건부 spread `...(address ? [...] : [])`

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| useYieldVaults.ts | 네임드 인덱스 맵 리팩토링 대상 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| callsPerVault/offset 제거 | ✅ useYieldVaults.ts | OK |
| indices Record 도입 | ✅ useYieldVaults.ts | OK |
| 결과 매핑 변경 | ✅ useYieldVaults.ts | OK |
| address 조건부 처리 | ✅ useYieldVaults.ts | OK |
| 소비자 컴포넌트 수정 | N/A (반환 타입 불변) | OK |

### 검증 통과: ✅

---

→ 다음: [Step 04: WS 재연결](step-04-ws-reconnect.md)
