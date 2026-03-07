# Step 04: Winston 구조화된 로깅

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: 가능 (git revert + logs/ 삭제)
- **선행 조건**: 없음 (Step 03과 독립, 병렬 가능)

---

## 1. 구현 내용 (design.md 기반)

- `winston.config.ts` 작성: JSON 포맷, daily rotation, 14일 보존, 20MB/파일
- `main.ts` 수정: `app.useLogger(WinstonModule.createLogger(config))`
- 로그 파일: `logs/agent-YYYY-MM-DD.log` (전체), `logs/error-YYYY-MM-DD.log` (에러)
- `.gitignore`에 `logs/` 추가
- 기존 NestJS Logger 호출 코드 변경 없음

## 2. 완료 조건
- [ ] (F7) 서버 시작 시 `logs/` 디렉토리에 `agent-YYYY-MM-DD.log` 파일 생성
- [ ] (F8) 에러 발생 시 `logs/error-YYYY-MM-DD.log`에 기록
- [ ] (F9) 로그 1줄이 JSON이고 timestamp, level, context, message 4개 필드 포함
- [ ] (F10) 기존 Logger 호출 코드(scheduler.service.ts, http-exception.filter.ts) 변경 없이 파일 로깅 동작
- [ ] (N3) logs/ 디렉토리가 .gitignore에 포함
- [ ] (N1) `npx tsc --noEmit` 에러 0
- [ ] (N2) `pnpm build` 성공

## 3. 롤백 방법
- `git revert` + `rm -rf apps/agent-server/logs/`
- 영향 범위: main.ts 초기화 코드, winston 설정 파일

---

## Scope

### 수정 대상 파일
```
apps/agent-server/
├── src/
│   └── main.ts                            # 수정 - winston logger 초기화
├── .gitignore                             # 수정 - logs/ 추가
└── package.json                           # 수정 - winston 의존성 추가
```

### 신규 생성 파일
```
apps/agent-server/src/
└── common/
    └── logger/
        └── winston.config.ts              # 신규 - winston 설정
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| main.ts | 직접 수정 | app.useLogger() 추가 |
| scheduler.service.ts | 간접 영향 | Logger → winston 자동 전환 |
| http-exception.filter.ts | 간접 영향 | Logger → winston 자동 전환 |

### Side Effect 위험
- console 로그가 파일로 전환되면서 콘솔 출력 형식 변경 → Console transport도 유지하면 무관

### 참고할 기존 패턴
- NestJS Logger 사용: `scheduler.service.ts`, `http-exception.filter.ts`

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| winston.config.ts | F7-F9 로깅 설정 | OK |
| main.ts | F10 전역 교체 | OK |
| package.json | 의존성 추가 | OK |
| .gitignore | N3 logs/ | OK |

### False Negative (누락)
없음

### 검증 통과: 확인

---

> 다음: [Step 05: Timeout](step-05-timeout.md)
