# Step 05: Runtime lstCTC 확장 (config + capabilities + observers)

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅
- **선행 조건**: Step 01 (core config)

---

## 1. 구현 내용 (design.md 기반)
- `config.ts`: `liquity` 단일 필드 → `liquityBranches: { wCTC, lstCTC }` 마이그레이션
- `types.ts`: `AgentConfig` 타입에 `liquityBranches` 반영
- capabilities (`liquity-adjust-interest-rate.ts`, `liquity-add-collateral.ts`): runtime context에서 active branch config 받도록 파라미터화
- observers (`liquity.ts`): manifest의 `liquityBranch`로 config 선택하여 snapshot 조회
- hints utility (`liquity-hints.ts`): `branchIdx` 파라미터 추가 (0n=wCTC, 1n=lstCTC)
- runtime.ts: manifest scope에서 branch 읽어 ctx에 전달

## 2. 완료 조건
- [ ] `config.liquityBranches.wCTC` 에 기존 wCTC 주소 존재
- [ ] `config.liquityBranches.lstCTC`에 lstCTC 주소 존재 (LIQUITY.branches.lstCTC 기준)
- [ ] 기존 `config.liquity` 단일 필드 제거됨
- [ ] capabilities가 branch config를 동적으로 사용
- [ ] `buildSnapshot`이 manifest의 `liquityBranch`를 읽어 해당 config로 조회
- [ ] `findHints`가 `branchIdx` 파라미터를 받음
- [ ] `cd packages/agent-runtime && npx tsc --noEmit` 통과

## 3. 롤백 방법
- `liquityBranches` → 기존 `liquity` 단일 필드로 복원, 파라미터 제거

---

## Scope

### 수정 대상 파일
```
packages/agent-runtime/src/config.ts                                    # liquityBranches 마이그레이션
packages/agent-runtime/src/types.ts                                     # AgentConfig 타입 변경
packages/agent-runtime/src/runtime.ts                                   # manifest branch → ctx
packages/agent-runtime/src/observers/liquity.ts                         # branch-aware snapshot
packages/agent-runtime/src/observers/build-snapshot.ts                  # branch 전달
packages/agent-runtime/src/capabilities/liquity-adjust-interest-rate.ts # branch config
packages/agent-runtime/src/capabilities/liquity-add-collateral.ts       # branch config
packages/agent-runtime/src/utils/liquity-hints.ts                       # branchIdx 파라미터
```

### 신규 생성 파일
없음

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| AgentConfig.liquity | 직접 수정 → liquityBranches | 모든 consumer 업데이트 필요 |
| executor (execute-plan.ts) | 간접 영향 | config 경로 변경 시 영향 확인 |
| registry.ts | 간접 영향 | capability 등록 시 config 참조 확인 |

### Side Effect 위험
- `config.liquity` 제거로 기존 wCTC 동작이 깨질 수 있음. 모든 참조를 `liquityBranches.wCTC`로 이전 확인 필수
- executor에서 config 참조 경로가 바뀌면 실행 실패 가능

### 참고할 기존 패턴
- `config.ts:29-37`: 기존 liquity config 구조
- `types.ts:114`: 기존 AgentConfig.liquity 타입

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| config.ts | liquityBranches 마이그레이션 | ✅ OK |
| types.ts | 타입 변경 | ✅ OK |
| runtime.ts | manifest → ctx | ✅ OK |
| liquity.ts (observers) | branch-aware snapshot | ✅ OK |
| build-snapshot.ts | branch 전달 | ✅ OK |
| liquity-adjust-interest-rate.ts | branch config | ✅ OK |
| liquity-add-collateral.ts | branch config | ✅ OK |
| liquity-hints.ts | branchIdx 파라미터 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| config 마이그레이션 | ✅ | OK |
| capability 파라미터화 | ✅ | OK |
| observer branch-aware | ✅ | OK |
| hints branchIdx | ✅ | OK |
| executor config 경로 | ✅ (Side Effect에서 확인) | OK |

### 검증 통과: ✅

---

→ 다음: [Step 06: Manifest + Scheduler](step-06-manifest-scheduler.md)
