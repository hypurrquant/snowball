# Step 03: Observer — Snapshot 수집

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅ (파일 삭제)
- **선행 조건**: Step 01 (타입, Config)
- **DoD 매핑**: F8

---

## 1. 구현 내용 (design.md 기반)

- `src/observers/vault.ts` — AgentVault balance, permission 상태, allowance 조회
- `src/observers/morpho.ts` — Morpho supply position, utilization rate, isAuthorized 조회
- `src/observers/liquity.ts` — Trove CR, 현재 이자율, 시장 평균 이자율, cooldown 상태
- `src/observers/build-snapshot.ts` — 위 3개 observer를 조합하여 `Snapshot` 반환
- 모든 조회는 viem `publicClient.readContract()` 사용
- ABI는 `packages/agent-runtime` 내부에 필요한 최소 ABI subset을 직접 정의 (또는 `apps/web/src/core/abis/`에서 공유 가능한 부분 참조)

## 2. 완료 조건

- [ ] `observers/vault.ts`가 vault balance + permission 상태를 반환
- [ ] `observers/morpho.ts`가 supply position + isAuthorized를 반환
- [ ] `observers/liquity.ts`가 trove CR + 이자율 + cooldown 정보를 반환
- [ ] `observers/build-snapshot.ts`가 3개 observer를 조합하여 `Snapshot` 타입 반환
- [ ] CLI로 테스트넷 대상 `buildSnapshot()` 실행 시 실제 데이터 출력 확인
- [ ] `tsc --noEmit` 통과

## 3. 롤백 방법
- `src/observers/` 디렉토리 삭제

---

## Scope

### 신규 생성 파일
```
packages/agent-runtime/src/observers/
├── vault.ts              # 신규 — vault balance, permission 조회
├── morpho.ts             # 신규 — supply position, isAuthorized
├── liquity.ts            # 신규 — trove CR, 이자율, cooldown
└── build-snapshot.ts     # 신규 — Snapshot 조합
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| types.ts | 직접 import | Snapshot 타입 |
| config.ts | 직접 import | contract addresses, publicClient |
| core/abis/* | 참조 | ABI 정의 (runtime 내 최소 subset 별도 정의) |

### 참고할 기존 패턴
- `apps/web/src/domains/agent/hooks/useVaultBalance.ts` — vault readContract 패턴
- `apps/web/src/domains/defi/lend/hooks/` — Morpho readContract 패턴
- `apps/web/src/domains/defi/borrow/hooks/` — Liquity readContract 패턴

### Side Effect 위험
- 테스트넷 RPC 호출 필요 — RPC 불안정 시 snapshot 실패 가능

## FP/FN 검증

### 검증 체크리스트
- [x] vault.ts — balance, permission 조회
- [x] morpho.ts — position, isAuthorized
- [x] liquity.ts — trove, 이자율, cooldown
- [x] build-snapshot.ts — 조합

### 검증 통과: ✅

---

> 다음: [Step 04: 4개 Capability 구현](step-04-capabilities.md)
