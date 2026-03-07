# Step 07: E2E 테스트

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: 가능 (git revert)
- **선행 조건**: Step 03~06 (모든 인프라 완성 후)

---

## 1. 구현 내용 (design.md 기반)

- Jest + @nestjs/testing + supertest 설정
- `test/agent.e2e-spec.ts` 작성: design.md 9개 시나리오
- AgentRuntime mock: overrideProvider('AGENT_RUNTIME')
- SQLite 임시 파일 DB: 테스트 격리 + persistence 검증
- jest-e2e.config.ts 설정 파일

## 2. 완료 조건
- [ ] (F16) `apps/agent-server/test/agent.e2e-spec.ts`에 9개+ 시나리오 각각에 대응하는 테스트 존재
  - 정상 실행(F3), API key 누락(E7), 동시 실행(E6), user 필터(F5), 단건 조회(F6), 서버 상태, rate limit(F11), persistence(F4), pre-insert 실패(E1), terminal update 실패+fallback(E2), crash recovery(E3)
- [ ] (E4) started→error 매핑 테스트: started 레코드 insert → GET /agent/runs → status='error' 반환
- [ ] (E5) bigint 직렬화 테스트: bigint 포함 RunResult mock → insert 성공
- [ ] (F17) 모든 테스트 통과 (`npx jest --config jest-e2e.config.ts` → exit 0)
- [ ] (F18) AgentRuntime이 mock으로 교체되어 실제 Claude API 호출 없음
- [ ] SQLite 임시 파일 DB 사용 (persistence 검증)

## 3. 롤백 방법
- `git revert` (테스트 파일 삭제)
- 영향 범위: test/ 디렉토리만. 프로덕션 코드 변경 없음

---

## Scope

### 수정 대상 파일
```
apps/agent-server/
├── package.json                           # 수정 - jest, supertest devDependencies
└── tsconfig.json                          # 수정 - test 경로 포함 (필요 시)
```

### 신규 생성 파일
```
apps/agent-server/
├── test/
│   └── agent.e2e-spec.ts                  # 신규 - E2E 테스트 9개 시나리오
└── jest-e2e.config.ts                     # 신규 - Jest E2E 설정
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| agent.module | 테스트 참조 | NestJS Testing Module import |
| agent.service | 테스트 참조 | 2-phase write 검증 |
| run-store.service | 테스트 참조 | DB 영속화 검증 |
| database.service | 테스트 참조 | 임시 DB 교체 |

### Side Effect 위험
- devDependencies만 추가. 프로덕션 번들에 영향 없음

### 참고할 기존 패턴
- NestJS 공식 E2E 테스트 패턴
- `apps/server/test/` (존재 시 참고)

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| agent.e2e-spec.ts | F16-F17 E2E | OK |
| jest-e2e.config.ts | 테스트 설정 | OK |
| package.json | devDeps | OK |

### False Negative (누락)
없음

### 검증 통과: 확인

---

> 완료: 모든 Step 개발 후 [Phase Complete](../../../archive/) 진행
