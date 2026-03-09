# Step 02: Bridge Hook Slimming (Sprint 2)

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅ (파일 이동 복구)
- **선행 조건**: Step 01 (formatUsdCompact 사용 가능성)

---

## 1. 구현 내용 (design.md 기반)

### 2-1. Session 관리 로직 추출 → `bridge/lib/bridgeSession.ts`
- `useBridgePipeline.ts`에서 localStorage 기반 session 관리 로직 추출
- `BridgeSession` 타입, `saveSession`, `loadSession`, `clearSession` 함수

### 2-2. Step/Phase 로직 추출 → `bridge/lib/bridgeSteps.ts`
- `useBridgePipeline.ts`에서 step 생성/phase 판정 순수 로직 추출
- `BridgePhase` 타입, `createInitialSteps`, `PHASE_STEP_MAP`, `resolveResumePhase` 등

### 2-3. useBridgePipeline thin wrapper화
- hook은 React state + effects만 담당
- 순수 로직은 lib에서 import

## 2. 완료 조건
- [ ] `grep "saveSession\|loadSession\|clearSession" apps/web/src/domains/bridge/lib/bridgeSession.ts` — 3건
- [ ] `grep "createInitialSteps\|resolveResumePhase\|PHASE_STEP_MAP" apps/web/src/domains/bridge/lib/bridgeSteps.ts` — 3건
- [ ] `grep -l "from.*lib/" apps/web/src/domains/bridge/hooks/useBridgePipeline.ts` — 매칭
- [ ] `cd apps/web && npx next build` — exit code 0
- [ ] Bridge 페이지 수동 접속 → 정상 렌더링 + step 진행 UI 표시 확인 (N3, E7)

## 3. 롤백 방법
- `git revert` 가능. 새 lib 파일 삭제, hook 원복
- 영향 범위: bridge 도메인만

---

## Scope

### 수정 대상 파일
```
apps/web/src/domains/bridge/
└── hooks/useBridgePipeline.ts  # 수정 - 순수 로직 제거, lib import 추가
```

### 신규 생성 파일
```
apps/web/src/domains/bridge/lib/
├── bridgeSession.ts   # 신규 - session CRUD
└── bridgeSteps.ts     # 신규 - step/phase 순수 로직
```

### Side Effect 위험
- Session migration 로직 이동 시 동작 변경 가능 → localStorage 데이터로 수동 테스트
- Polling useEffect closure → effect 내부는 그대로, 상수만 추출

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| useBridgePipeline.ts | 2-3 thin wrapper | ✅ OK |
| bridgeSession.ts | 2-1 session 추출 | ✅ OK |
| bridgeSteps.ts | 2-2 steps 추출 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| session 관리 추출 | ✅ | OK |
| step/phase 추출 | ✅ | OK |
| hook thin wrapper | ✅ | OK |

### 검증 통과: ✅

---

> 다음: [Step 03: Liquity + Borrow](step-03-liquity-borrow.md)
