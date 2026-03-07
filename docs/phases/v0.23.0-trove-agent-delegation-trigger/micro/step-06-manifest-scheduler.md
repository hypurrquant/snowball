# Step 06: lstCTC Manifest + Scheduler 양 브랜치 스캔

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅
- **선행 조건**: Step 05 (runtime config)

---

## 1. 구현 내용 (design.md 기반)
- lstCTC manifest 파일 생성 (`packages/agent-runtime/manifests/demo-agent-lstctc.json`)
- scheduler가 양 브랜치 TroveManager를 스캔하여 사용자별 troveId를 branch에 매칭
- scheduler가 manifest별 branch에 맞는 troveId를 `runAgent`에 전달

## 2. 완료 조건
- [ ] `packages/agent-runtime/manifests/demo-agent-lstctc.json` 존재
- [ ] lstCTC manifest의 `scope.liquityBranch`가 `"lstCTC"`로 설정
- [ ] scheduler가 wCTC + lstCTC 양 브랜치의 TroveManager를 스캔
- [ ] scheduler가 manifest의 `liquityBranch`에 해당하는 branch의 troveId만 `runAgent`에 전달
- [ ] `runAgent` API 시그니처 `{ user, manifestId, troveId }` 변경 없음 유지
- [ ] `cd apps/agent-server && npx tsc --noEmit` 통과
- [ ] `cd packages/agent-runtime && npx tsc --noEmit` 통과

## 3. 롤백 방법
- lstCTC manifest 파일 삭제, scheduler 변경 되돌리기

---

## Scope

### 수정 대상 파일
```
apps/agent-server/src/scheduler/scheduler.service.ts   # 양 브랜치 TroveManager 스캔 + branch별 troveId 매칭
```

### 신규 생성 파일
```
packages/agent-runtime/manifests/demo-agent-lstctc.json   # lstCTC manifest
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| config.liquityBranches | 직접 사용 | 양 브랜치 TroveManager 주소 참조 (Step 05) |
| AgentManifest.scope | 직접 사용 | liquityBranch 필드로 branch 판단 |
| TroveManager ABI | 기존 사용 | getTroveIdsCount, getTroveFromTroveIdsArray |

### Side Effect 위험
- scheduler 실행 주기/성능: 양 브랜치 스캔으로 RPC 호출 2배 증가 (수용 가능)

### 참고할 기존 패턴
- `packages/agent-runtime/manifests/demo-agent.json`: 기존 wCTC manifest 구조
- `scheduler.service.ts:58`: 기존 단일 브랜치 스캔 로직

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| scheduler.service.ts | 양 브랜치 스캔 + branch 매칭 | ✅ OK |
| demo-agent-lstctc.json | lstCTC manifest | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| lstCTC manifest 생성 | ✅ | OK |
| scheduler 양 브랜치 스캔 | ✅ | OK |
| branch별 troveId 매칭 | ✅ | OK |

### 검증 통과: ✅
