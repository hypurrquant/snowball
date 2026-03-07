# Step 04: Borrow 페이지 UI (위임 버튼 + 상태 뱃지 + 해제)

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅
- **선행 조건**: Step 01 (defaultAgentId), Step 02 (hooks), Step 03 (wizard branch 지원)

---

## 1. 구현 내용 (design.md 기반)
- Trove 카드에 "Delegate to Agent" 버튼 추가 → `/agent/delegate/{defaultAgentId}?scenario=liquity&troveId={id}&branch={branch}` 라우팅
- `useTroveDelegationStatus` 훅으로 위임 상태 조회 → 뱃지 표시
- 위임된 Trove에 "Undelegate" 버튼 + 확인 다이얼로그 → `fullUndelegate` 호출
- 위임 상태에 따라 Delegate/Undelegate 버튼 토글

## 2. 완료 조건
- [ ] 미위임 Trove 카드에 "Delegate to Agent" 버튼 표시
- [ ] 버튼 클릭 시 올바른 URL로 라우팅 (defaultAgentId, troveId, branch 포함)
- [ ] 위임된 Trove에 "Agent Delegated" 뱃지 표시
- [ ] 위임된 Trove에 "Undelegate" 버튼 표시 (Delegate 버튼 대신)
- [ ] Undelegate 클릭 시 확인 다이얼로그 표시
- [ ] 확인 시 fullUndelegate 실행 → on-chain 완전 해제
- [ ] 지갑 미연결 시 위임/해제 버튼 비활성화
- [ ] wCTC/lstCTC 브랜치 각각 정상 동작
- [ ] Trove 없는 사용자 → Delegate 버튼 미표시 (Trove 카드 자체 없음 — E1)
- [ ] 이미 위임된 Trove → "Undelegate" 버튼만 표시, "Delegate" 버튼 숨김 (E2)
- [ ] 부분 위임 상태(addManager만) → 뱃지 미표시, Delegate 버튼 유지 (E3)
- [ ] Undelegate 트랜잭션 실패 시 에러 메시지 표시 (E4)
- [ ] 지갑 미연결 시 위임/해제 버튼 비활성화 (E5)
- [ ] app 레이어에서만 agent 도메인 상수(defaultAgentId) import (N5)
- [ ] `npx tsc --noEmit` (apps/web) 통과
- [ ] `npm run build` (apps/web) 성공 (N2)

## 3. 롤백 방법
- Trove 카드에 추가한 UI 요소 삭제, hook import 제거

---

## Scope

### 수정 대상 파일
```
apps/web/src/app/(defi)/liquity/borrow/page.tsx   # 위임 버튼, 상태 뱃지, 해제 다이얼로그
```

### 신규 생성 파일
없음

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| ERC8004.defaultAgentId | 직접 사용 | 라우팅 URL 생성 |
| useTroveDelegationStatus | 직접 사용 | 위임 상태 조회 (Step 02) |
| useTroveDelegate.fullUndelegate | 직접 사용 | 해제 실행 (Step 02) |

### Side Effect 위험
- 기존 Trove 카드의 Edit/Close 버튼 레이아웃에 영향 가능. 기존 버튼과 조화롭게 배치 필요

### 참고할 기존 패턴
- `borrow/page.tsx:424-445`: 기존 Edit/Close 버튼 레이아웃

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| borrow/page.tsx | 위임 버튼 + 뱃지 + 해제 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| Delegate 버튼 | ✅ page.tsx | OK |
| 상태 뱃지 | ✅ page.tsx | OK |
| Undelegate 다이얼로그 | ✅ page.tsx | OK |

### 검증 통과: ✅

---

→ 다음: [Step 05: Runtime lstCTC 확장](step-05-runtime-lstctc.md)
