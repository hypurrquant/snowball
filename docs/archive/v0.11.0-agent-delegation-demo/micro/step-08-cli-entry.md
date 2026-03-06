# Step 08: CLI 엔트리 (agent-bot.ts)

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (파일 삭제)
- **선행 조건**: Step 07 (Runtime 오케스트레이터)
- **DoD 매핑**: F46

---

## 1. 구현 내용 (design.md 기반)

- `packages/integration/scripts/agent-bot.ts` — CLI 엔트리 포인트
  - `--user <address>` — 대상 유저 주소
  - `--manifest <path>` — AgentManifest JSON 파일 경로
  - agent-runtime의 `AgentRuntime.run()` 직접 호출 (NestJS 미경유)
  - 결과를 터미널에 출력 (snapshot, plan, tx receipts, reasoning)
  - 에러 시 exit code 1 + 에러 메시지 출력

## 2. 완료 조건

- [ ] `packages/integration/scripts/agent-bot.ts` 파일 존재
- [ ] `npx tsx packages/integration/scripts/agent-bot.ts --user <addr> --manifest <path>` 실행 가능
- [ ] 실행 시 snapshot, plan, tx receipts를 터미널에 출력
- [ ] manifest 파일이 없거나 잘못된 경우 에러 메시지 출력
- [ ] `tsc --noEmit` 통과 (agent-runtime 패키지 대상)

## 3. 롤백 방법
- `packages/integration/scripts/agent-bot.ts` 삭제

---

## Scope

### 신규 생성 파일
```
packages/integration/scripts/
└── agent-bot.ts            # 신규 — CLI 엔트리
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| @snowball/agent-runtime | 직접 import | AgentRuntime |
| dotenv | 직접 import | 환경변수 로드 |

### 참고할 기존 패턴
- `packages/integration/scripts/deploy-viem.ts` — CLI 스크립트 패턴 (dotenv, viem, args 파싱)

## FP/FN 검증

### 검증 체크리스트
- [x] agent-bot.ts — F46 CLI 엔트리
- [x] --user, --manifest 인자 파싱
- [x] 결과 출력 (snapshot, plan, tx receipts)

### 검증 통과: ✅

---

> 다음: [Step 09: agent-server NestJS](step-09-nestjs-server.md)
