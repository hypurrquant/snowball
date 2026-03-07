# Step 04: Config 타입 업데이트 (troveNFT)

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: ✅
- **선행 조건**: Step 02 완료 (addresses.ts에 troveNFT 주소 확인)

---

## 1. 구현 내용 (design.md 기반)
- `packages/agent-runtime/src/types.ts`의 `AgentConfig.liquity`에 `troveNFT: Address` 필드 추가
- `packages/agent-runtime/src/config.ts`의 `loadConfig()` 반환값에 `liquity.troveNFT` 주소 추가
  - 주소 출처: `packages/core/src/config/addresses.ts` → `LIQUITY.branches.wCTC.troveNFT`

## 2. 완료 조건
- [ ] `AgentConfig.liquity` 타입에 `troveNFT: Address` 필드가 있다
- [ ] `loadConfig()` 반환값의 `liquity.troveNFT`가 wCTC branch의 troveNFT 주소와 일치한다
- [ ] `cd packages/agent-runtime && npx tsc --noEmit` 통과
- [ ] `cd packages/agent-runtime && npm run build` 성공 (중간 확인 — N3 최종 소유는 Step 05)

## 3. 롤백 방법
- git revert로 타입/config 원복

---

## Scope

### 수정 대상 파일
```
packages/agent-runtime/src/types.ts    # 수정 - AgentConfig.liquity에 troveNFT 추가
packages/agent-runtime/src/config.ts   # 수정 - loadConfig()에 liquity.troveNFT 주소 추가
```

### 신규 생성 파일
없음

### Side Effect 위험
- 타입 필드 추가는 optional이 아니므로 loadConfig() 이외의 AgentConfig 생성 코드가 있다면 컴파일 에러
- 확인: AgentConfig는 loadConfig()에서만 생성됨 → 안전

---

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| types.ts | troveNFT 필드 추가 | ✅ OK |
| config.ts | troveNFT 주소 할당 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| 타입 필드 추가 | ✅ types.ts | OK |
| 주소 할당 | ✅ config.ts | OK |

### 검증 통과: ✅

---

→ 다음: [Step 05: vault.ts expiry 정렬](step-05-vault-expiry.md)
