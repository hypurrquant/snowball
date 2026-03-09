# 설계 - v0.24.0 DDD Layer Refactoring

## 변경 규모
**규모**: 일반 기능
**근거**: 16개 파일 생성, 27개 파일 수정, 1개 삭제. 2개+ 컴포넌트 수정, 내부 import 경로 변경. 다만 외부 API/DB 스키마 변경 없고 behavior-preserving이므로 운영 리스크 아님.

---

## 문제 요약
hooks에 순수 로직이 묻혀있고, shared가 dumping ground가 되고, app page에 비즈니스 로직이 남아있어 유지보수 비용이 증가하고 있음.

> 상세: [README.md](README.md) 참조

## 접근법
- **5 Sprint 순차 실행**: Foundation → Bridge → Liquity → Trade → Morpho+Yield+Agent
- **파일 이동 + re-export**: 기존 import를 깨지 않기 위해 이동 시 원래 위치에 re-export를 남김. 추후 점진적으로 직접 import으로 전환
- **Hook Slimming**: hook에서 순수 계산/변환/상수/타입을 domain/lib/로 추출. hook은 React wrapper(useState, useMemo, useReadContracts 등)만 담당
- **매직 넘버 상수화**: 각 domain에 `lib/constants.ts` 생성하여 이름 있는 상수로 관리

## 대안 검토

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: 전면 재작성 (모든 hook/page 한번에) | 일관된 구조, 한번에 완료 | 리스크 극대화, 회귀 추적 불가, PR 크기 과대 | ❌ |
| B: Sprint별 순차 리팩토링 (re-export 패턴) | Sprint별 롤백 가능, PR 리뷰 가능, 점진적 개선 | re-export 임시 중복, 완료까지 시간 | ✅ |
| C: 필요할 때만 리팩토링 (opportunistic) | 위험 최소, 현재 delivery에 영향 없음 | 구조적 부채 누적, 일관성 부재 | ❌ |

**선택 이유**: B는 각 Sprint이 독립 branch에서 작업되고, 문제 발생 시 해당 branch만 revert 가능. re-export로 기존 import가 깨지지 않아 안전.

## 기술 결정
- **re-export 패턴**: 파일 이동 시 원래 위치에 `export * from "new/path"` 남김. 추후 직접 import으로 전환
- **domain/lib/ 표준**: 모든 도메인에 `lib/` 디렉토리 + `constants.ts` 생성
- **packages/core 확장**: cross-runtime 유틸만 추가 (`sortTokens`, `parseTokenAmount`, `needsApproval`)
- **cross-domain 의존성**: yield → morpho/lib은 정당한 의존으로 허용 (Morpho-backed vault의 수학 함수 사용)
- **crColor 같은 UI 값**: hook에 남기고, 순수 계산만 lib으로 이동
- **cross-domain import 규칙**: domain 간 import는 app layer에서만 허용. TroveDelegation 컴포넌트는 UI(props)만 담당하고, agent 권한 orchestration(useVaultPermission 등)은 app layer(borrow/page.tsx)에 남김
- **deep import 제거**: `@snowball/core/src/...` deep import는 `@snowball/core` public export로 직접 교체 (packages/core/src/index.ts가 이미 volume/types를 export하므로 별도 re-export 파일 불필요)
- **packages/core scope**: `sortTokens`, `parseTokenAmount`, `needsApproval`만 추가. `formatTokenAmount`는 이번 phase scope 밖 (scripts에서 아직 사용하지 않으므로)

---

## 범위 / 비범위
- **범위(In Scope)**: `apps/web/src/` 내 core/shared/domains/app 레이어 정리, `packages/core/src/` 유틸 추가
- **비범위(Out of Scope)**: Options 모듈, `packages/agent-runtime`, `apps/agent-server`, `useSmartDeposit`/`useCreatePosition` 같은 복잡 write hook, UI redesign, 테스트 프레임워크 도입

## 아키텍처 개요

### 5 Sprint 구조

```
Sprint 1: Foundation Hygiene
├── packages/core에 sortTokens, parseTokenAmount, needsApproval 추가
├── apps/web/src/core/types/tx.ts 생성 (TxStep 등 이동)
├── shared/lib/utils.ts에 formatUsdCompact 통합
├── deep import 제거 (@snowball/core public export 사용)
└── TokenAmount.tsx 삭제

Sprint 2: Bridge
├── bridge/lib/bridgeSession.ts (session 관리)
└── bridge/lib/bridgeSteps.ts (step/phase 로직)

Sprint 3: Liquity + Borrow Page
├── liquity/lib/constants.ts
├── liquityMath.ts 확장 (preview, stats, validation)
├── TroveDelegation.tsx 컴포넌트 추출 (UI만, agent hook은 app layer에 유지)
└── useOpenTrovePipeline.ts hook 생성

Sprint 4: Trade + Pool Add Page
├── trade/lib/tickUtils.ts, statsApi.ts, poolListMapper.ts, constants.ts
├── TokenSelector shared → trade 이동
└── pool/add/page.tsx 상수 정리

Sprint 5: Morpho + Yield + Agent
├── morphoMath.ts shared → morpho/lib 이동
├── morpho/lib/constants.ts, yield/lib/constants.ts, agent/lib/constants.ts
├── yield/lib/vaultMapper.ts + yield/types.ts
└── agent/lib/agentMapper.ts
```

### 이동 방향 다이어그램

```
packages/core (새로 추가)
  ├── sortTokens     ← shared/lib/utils.ts
  ├── parseTokenAmount ← shared/lib/utils.ts
  └── needsApproval   ← shared/hooks/useTokenApproval.ts (순수 함수 추출)

apps/web/src/core (새로 추가)
  └── types/tx.ts     ← shared/types/tx.ts

shared (정리)
  ├── morphoMath.ts   → domains/defi/morpho/lib/ (re-export 유지)
  ├── TokenSelector   → domains/trade/components/ (이동)
  └── TokenAmount.tsx → 삭제

domains/*/lib/ (확장)
  ├── bridge/lib/bridgeSession.ts, bridgeSteps.ts
  ├── liquity/lib/constants.ts, liquityMath.ts 확장
  ├── morpho/lib/constants.ts, morphoMath.ts (이동됨)
  ├── yield/lib/constants.ts, vaultMapper.ts
  ├── trade/lib/tickUtils.ts, statsApi.ts, poolListMapper.ts, constants.ts
  └── agent/lib/constants.ts, agentMapper.ts
```

## 테스트 전략
- **빌드 검증**: 각 Sprint 완료 후 `cd apps/web && npx next build`로 타입 에러/import 누락 확인
- **packages/core 변경 Sprint**: `apps/server` 빌드도 함께 확인
- **런타임 검증**: 변경된 도메인 페이지 수동 접속하여 정상 렌더링 확인
- **수치 검증**: 포맷팅/계산 결과가 리팩토링 전후 동일한지 확인 (특히 BigInt 계산)

## 리스크/오픈 이슈

| # | 리스크 | 영향 | 완화 |
|---|--------|------|------|
| 1 | Import 경로 변경으로 빌드 실패 | High | re-export 패턴 + 각 Sprint 후 빌드 확인 |
| 2 | re-export 체이닝 과도 | Medium | 추후 직접 import으로 점진 전환 |
| 3 | formatUsdCompact vs 기존 formatUsd 미묘한 차이 | Low | 각 사용처에서 출력 비교 |
| 4 | yield → morpho cross-domain 의존 | Medium | 정당한 의존으로 허용, 필요시 packages/core 승격 |
| 5 | borrow page 분리 시 상태 흐름 추적 어려움 | Medium | useOpenTrovePipeline이 모든 tx 상태 캡슐화 |

### 상세 실행 계획
> 상세: `docs/refactoring/ddd-layer-hygiene-refactor-plan-2026-03-09.md` 참조
