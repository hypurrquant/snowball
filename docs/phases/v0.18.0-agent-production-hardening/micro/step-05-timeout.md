# Step 05: Anthropic SDK Timeout

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: 가능 (git revert)
- **선행 조건**: 없음 (독립)

---

## 1. 구현 내용 (design.md 기반)

- `anthropic-planner.ts`에서 Anthropic 클라이언트 생성 시 `timeout: 60_000` 옵션 추가
- 1줄 변경. 파이프라인 로직 변경 없음
- timeout 시 SDK가 `APIConnectionTimeoutError` throw → 기존 catch 블록에서 RunResult { status: 'error' } 처리

## 2. 완료 조건
- [ ] (F14) `anthropic-planner.ts`에서 `new Anthropic({ timeout: 60_000 })` 설정 존재
- [ ] (F15) timeout 시 `APIConnectionTimeoutError` → `RunResult { status: 'error' }` 처리 경로 존재 (코드 리뷰: runtime.run() catch 블록에서 에러를 RunResult로 변환하는 로직 확인)
- [ ] (N1) `npx tsc --noEmit -p packages/agent-runtime/tsconfig.json` 에러 0

## 3. 롤백 방법
- `git revert` (1줄 변경)
- 영향 범위: anthropic-planner.ts 1개 파일

---

## Scope

### 수정 대상 파일
```
packages/agent-runtime/src/
└── planner/
    └── anthropic-planner.ts               # 수정 - timeout 옵션 1줄 추가
```

### 신규 생성 파일
없음

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| anthropic-planner.ts | 직접 수정 | SDK 클라이언트 옵션 |

### Side Effect 위험
- 없음. SDK 내장 옵션 사용

### 참고할 기존 패턴
- `anthropic-planner.ts`: 현재 `new Anthropic()` 호출 위치

## FP/FN 검증

### False Positive (과잉)
없음

### False Negative (누락)
없음

### 검증 통과: 확인

---

> 다음: [Step 06: Rate Limiting](step-06-rate-limit.md)
