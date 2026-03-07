# Step 06: API Rate Limiting

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: 가능 (git revert)
- **선행 조건**: 없음 (독립)

---

## 1. 구현 내용 (design.md 기반)

- `@nestjs/throttler` 패키지 설치
- `app.module.ts`에 ThrottlerModule.forRoot() 등록 (기본: 60/분)
- ThrottlerGuard를 Global Guard로 등록
- `agent.controller.ts`에 `@Throttle({ default: { limit: 10, ttl: 60000 } })` 데코레이터 (POST /agent/run)
- Rate limit 초과 시 429 Too Many Requests 응답

## 2. 완료 조건
- [ ] (F11) POST /agent/run을 1분 내 11회 호출 시 11번째에서 429 반환
- [ ] (F12) 다른 엔드포인트는 1분 내 61회 호출 시 429 반환
- [ ] (F13) Cron 내부 호출은 rate limit 영향 없음 (코드 리뷰: ThrottlerGuard는 HTTP만 적용)
- [ ] (N4) 기존 API 계약 무변경 (429 추가만, 기존 스키마 동일)
- [ ] (N1) `npx tsc --noEmit` 에러 0
- [ ] (N2) `pnpm build` 성공

## 3. 롤백 방법
- `git revert` + `pnpm install` (패키지 제거)
- 영향 범위: app.module, agent.controller

---

## Scope

### 수정 대상 파일
```
apps/agent-server/
├── src/
│   ├── app.module.ts                      # 수정 - ThrottlerModule + Guard 등록
│   └── agent/
│       └── agent.controller.ts            # 수정 - @Throttle 데코레이터
└── package.json                           # 수정 - @nestjs/throttler 추가
```

### 신규 생성 파일
없음

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| app.module | 직접 수정 | 모듈 등록 |
| agent.controller | 직접 수정 | 엔드포인트별 제한 |
| scheduler.service | 영향 없음 | HTTP 아닌 내부 호출 |

### Side Effect 위험
- ThrottlerGuard가 모든 HTTP 요청에 적용 → Swagger 등 개발용 엔드포인트도 제한
- 대응: 기본값 60/분으로 충분히 넉넉

### 참고할 기존 패턴
- `agent.controller.ts`: 기존 @UseGuards(ApiKeyGuard) 패턴

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| app.module | F11-F13 Guard 등록 | OK |
| agent.controller | F11 엔드포인트별 제한 | OK |
| package.json | 의존성 | OK |

### False Negative (누락)
없음

### 검증 통과: 확인

---

> 다음: [Step 07: E2E 테스트](step-07-e2e-test.md)
