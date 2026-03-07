# Step 01: packages/core 생성 + web re-export

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅ (packages/core 삭제 + re-export 되돌리기)
- **선행 조건**: 없음
- **DoD 커버**: F1, F2

---

## 1. 구현 내용 (design.md 기반)

- `packages/core` 디렉토리 생성 (@snowball/core)
- package.json, tsconfig.json 설정
- apps/web/src/core/에서 React-free 모듈을 packages/core/로 이동:
  - `abis/` — ABI 상수 (dex.ts, liquity.ts, lend.ts, yield.ts, agent.ts)
  - `config/addresses.ts` — 컨트랙트 주소 + TOKEN_INFO (mockPriceUsd 포함)
  - `config/pools.ts` — DEX_POOLS 정적 정의 (서버용 신규)
  - `lib/` — 유틸리티 (formatters 등, React 의존 없는 것만)
- apps/web/src/core/ 파일들을 @snowball/core re-export로 전환
- pnpm-workspace.yaml에 packages/core 추가
- apps/web/package.json에 @snowball/core 워크스페이스 의존성 추가

## 2. 완료 조건
- [ ] `packages/core/package.json`이 존재하고 name이 `@snowball/core`
- [ ] `packages/core/tsconfig.json`이 존재하고 컴파일 가능
- [ ] ABI, addresses(TOKEN_INFO 포함), pools가 packages/core/에 존재
- [ ] `apps/web/src/core/config/addresses.ts`가 `@snowball/core`에서 re-export
- [ ] `pnpm install` 성공 (exit code 0)
- [ ] `cd apps/web && npx tsc --noEmit` 성공
- [ ] `pnpm --filter web build` 성공
- [ ] /pool 페이지 렌더링 정상 (에러 없음)

## 3. 롤백 방법
- `rm -rf packages/core`
- apps/web/src/core/ 파일 git restore
- pnpm-workspace.yaml, apps/web/package.json git restore

---

## Scope

### 신규 생성 파일
```
packages/core/
├── package.json          # @snowball/core, deps: viem
├── tsconfig.json
├── src/
│   ├── index.ts          # barrel export
│   ├── abis/             # apps/web/src/core/abis/ 에서 이동
│   │   ├── index.ts
│   │   ├── dex.ts
│   │   ├── lend.ts
│   │   ├── liquity.ts
│   │   ├── yield.ts
│   │   └── agent.ts
│   ├── config/
│   │   ├── addresses.ts  # TOKENS, DEX, LEND, YIELD, ERC8004, TOKEN_INFO
│   │   ├── chain.ts      # creditcoinTestnet (viem defineChain)
│   │   └── pools.ts      # DEX_POOLS 정적 정의 (서버용)
│   ├── dex/
│   │   ├── calculators.ts
│   │   └── types.ts
│   └── volume/
│       └── types.ts      # SwapLogEntry, HourlyVolume 등 (서버+프론트 공유)
```

### 수정 대상 파일
```
pnpm-workspace.yaml                    # "packages/core" 추가
apps/web/package.json                  # @snowball/core 워크스페이스 의존성 추가
apps/web/src/core/abis/index.ts        # re-export from @snowball/core
apps/web/src/core/abis/dex.ts          # re-export
apps/web/src/core/abis/lend.ts         # re-export
apps/web/src/core/abis/liquity.ts      # re-export
apps/web/src/core/abis/yield.ts        # re-export
apps/web/src/core/abis/agent.ts        # re-export
apps/web/src/core/config/addresses.ts  # re-export
apps/web/src/core/config/chain.ts      # re-export
apps/web/src/core/dex/calculators.ts   # re-export
apps/web/src/core/dex/types.ts         # re-export
```

**주의**: `config/tokens.ts`와 `config/pools.ts`는 현재 `addresses.ts` 안에 TOKEN_INFO로 통합되어 있음. packages/core에서는 `config/addresses.ts` 하나에 TOKENS, TOKEN_INFO, DEX, LEND 등을 모두 포함하고, 서버용 DEX_POOLS 정의는 `config/pools.ts`로 신규 생성.

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| apps/web 전체 | 간접 영향 | @/core/* import가 re-export 경유로 변경, 런타임 동일 |
| options 관련 | 제외 | options.ts ABI는 MVP 제외이므로 이동하지 않음 |

### Side Effect 위험
- re-export 후 tsconfig paths가 정상 작동하는지 확인 필요
- BigInt 리터럴 (LEND.markets[].lltv)이 packages/core에서 정상 컴파일되는지 확인

### 참고할 기존 패턴
- `HypurrQuant_FE/packages/core/` — @hq/core 패키지 구조

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| options.ts ABI | MVP 제외 — 이동 불필요 | ✅ OK (제외됨) |
| volume/types.ts | 서버에서도 사용할 공유 타입 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| ABI 이동 | ✅ | OK |
| addresses 이동 | ✅ | OK |
| chain 이동 | ✅ | OK |
| dex calculators 이동 | ✅ | OK |
| re-export 전환 | ✅ | OK |
| pnpm-workspace 수정 | ✅ | OK |

### 검증 통과: ✅

---

→ 다음: [Step 02: NestJS 서버 스캐폴딩](step-02-server-scaffold.md)
