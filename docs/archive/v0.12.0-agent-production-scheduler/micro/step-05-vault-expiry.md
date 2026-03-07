# Step 05: vault.ts expiry 체크 정렬

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: ✅
- **선행 조건**: 없음 (독립 수정)

---

## 1. 구현 내용 (design.md TD-7)
- `packages/agent-runtime/src/observers/vault.ts` line 45의 expiry 체크를 `>` → `>=`로 변경
- 변경 전: `permResult.expiry > now`
- 변경 후: `permResult.expiry >= now`
- 이유: 컨트랙트 `executeOnBehalf`는 `block.timestamp <= perm.expiry` 사용. vault observer도 동일 semantics로 정렬

## 2. 완료 조건
- [ ] vault.ts의 isActive 계산에서 `permResult.expiry >= now` (>= 연산자) 사용
- [ ] `cd packages/agent-runtime && npx tsc --noEmit` 통과
- [ ] `cd packages/agent-runtime && npm run build` 성공 (DoD N3 — agent-runtime 최종 수정 티켓)

## 3. 롤백 방법
- `>=` → `>` 로 되돌림

---

## Scope

### 수정 대상 파일
```
packages/agent-runtime/src/observers/vault.ts  # 수정 - line 45 `>` → `>=`
```

### 신규 생성 파일
없음

### Side Effect 위험
- expiry == now 시점에 active 판정이 true → false에서 true → true로 변경
- 컨트랙트와 일치하므로 정확한 동작

---

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| vault.ts | expiry 연산자 변경 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| expiry 연산자 변경 | ✅ vault.ts | OK |

### 검증 통과: ✅

---

→ 다음: [Step 06: 스케줄러 멀티유저 루프](step-06-scheduler.md)
