# Step 06: MyPositionsBanner + Pool 페이지 수정

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (신규 파일 1개 + 기존 파일 1줄 수정)
- **선행 조건**: Step 05

---

## 1. 구현 내용 (design.md 기반)
- `domains/trade/components/MyPositionsBanner.tsx` 신규 생성
  - balanceOf 1회 호출만으로 경량 동작
  - "You have N active LP positions [View All →]" 형태
  - balanceOf = 0 또는 지갑 미연결 시 미표시
- `app/(trade)/pool/page.tsx`에 MyPositionsBanner 삽입 (Header 아래)

## 2. 완료 조건
- [ ] `MyPositionsBanner` 컴포넌트가 export됨
- [ ] balanceOf > 0일 때 "You have N active LP positions [View All]" 표시
- [ ] balanceOf = 0 또는 지갑 미연결 시 배너 미표시
- [ ] "View All" 클릭 시 `/pool/positions`로 이동
- [ ] `/pool` 페이지 Header 아래에 배너 삽입됨

## 3. 롤백 방법
- `MyPositionsBanner.tsx` 삭제 + pool/page.tsx에서 import/렌더링 제거

---

## Scope

### 수정 대상 파일
```
apps/web/src/app/(trade)/pool/page.tsx  # 수정 - MyPositionsBanner import + 렌더링 추가
```

### 신규 생성 파일
```
apps/web/src/domains/trade/components/MyPositionsBanner.tsx  # 신규 - 배너 컴포넌트
```

### Side Effect 위험
- pool/page.tsx 수정이 기존 Pool 목록 UI에 영향 가능 → 배너를 Header와 Stats 사이에 삽입하여 최소 영향

### 참고할 기존 패턴
- `app/(trade)/pool/page.tsx`: 기존 헤더/통계 구조

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| pool/page.tsx | 배너 삽입 | ✅ OK |
| MyPositionsBanner.tsx | 배너 컴포넌트 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| 배너 + 페이지 수정 | ✅ | OK |

### 검증 통과: ✅
