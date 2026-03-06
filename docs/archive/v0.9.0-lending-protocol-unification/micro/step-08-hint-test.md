# Step 08: Hint 폴백 테스트 스크립트

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: ✅ (파일 추가만)
- **선행 조건**: Step 01 (liquityMath.ts 순수 함수)

---

## 1. 구현 내용 (dod.md E7 기반)
- `scripts/test-hint-fallback.ts`: Liquity hint 계산 순수 함수를 import하여, 내부적으로 throw 시 (0n, 0n)으로 폴백하는지 검증하는 스크립트
- repo root에서 `npx tsx scripts/test-hint-fallback.ts` 실행

## 2. 완료 조건
- [ ] `scripts/test-hint-fallback.ts` 파일 존재
- [ ] `npx tsx scripts/test-hint-fallback.ts` (repo root에서 실행) 종료코드 0 + "PASS" 출력
- [ ] hint 계산 함수가 throw 시 (0n, 0n) 반환하는지 검증

## 3. 롤백 방법
- `scripts/test-hint-fallback.ts` 삭제
- 영향 범위: 없음

---

## Scope

### 신규 생성 파일
```
scripts/test-hint-fallback.ts           # 신규 - hint 폴백 단위 테스트 스크립트
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| Step 01 산출물 (`liquityMath.ts`) | import | hint 계산 순수 함수 (getInsertPosition 또는 동등) |
| tsx | 실행 의존 | `npx tsx` 으로 TypeScript 직접 실행 |

### Side Effect 위험
- 없음 (독립 스크립트)

### 참고할 기존 패턴
- N/A (신규 패턴)

## FP/FN 검증

### False Positive (과잉)
파일 1개만 — FP 없음

### False Negative (누락)
없음

### 검증 통과: ✅
