# Step 02: 네비 공유 상수 추출

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅
- **선행 조건**: 없음
- **DoD 매핑**: F2, F3, F4

---

## 1. 구현 내용 (design.md 기반)
- `apps/web/src/config/nav.tsx` 신규 생성: `NavItem`, `NavGroup` 타입 + `NAV_GROUPS` 상수 export
- 아이콘은 컴포넌트 함수로 정의, `className`을 인자로 받아 크기 분리 (Sidebar: `w-4 h-4`, MobileNav: `w-5 h-5`)
- `Sidebar.tsx`: 내부 `NAV_GROUPS` 배열 + 타입 정의 제거 → `nav.tsx`에서 import
- `MobileNav.tsx`: 내부 `MOBILE_NAV` 배열 제거 → `NAV_GROUPS.flatMap(g => g.items)`로 flat 렌더링
- MobileNav에 Yield 항목 자동 포함 (NAV_GROUPS에서 가져오므로)

## 2. 완료 조건
- [ ] `grep "export.*NAV_GROUPS" apps/web/src/config/nav.tsx` → 매치
- [ ] `grep "NAV_GROUPS\|MOBILE_NAV" apps/web/src/components/layout/Sidebar.tsx apps/web/src/components/layout/MobileNav.tsx` → NAV_GROUPS만 존재 (MOBILE_NAV 없음)
- [ ] `grep -i "yield" apps/web/src/config/nav.tsx` → Yield 항목 존재
- [ ] `cd apps/web && npx tsc --noEmit` 성공

## 3. 롤백 방법
- 롤백 절차: `nav.tsx` 삭제, `Sidebar.tsx`와 `MobileNav.tsx`의 원래 배열 복원 (git checkout)
- 영향 범위: 사이드바, 모바일 네비게이션 UI

---

## Scope

### 수정 대상 파일
```
apps/web/src/
├── components/layout/
│   ├── Sidebar.tsx    # 수정 - NAV_GROUPS/NavItem/NavGroup 정의 제거, nav.tsx import 추가
│   └── MobileNav.tsx  # 수정 - MOBILE_NAV 정의 제거, nav.tsx import + flatMap 렌더링
```

### 신규 생성 파일
```
apps/web/src/
└── config/nav.tsx     # 신규 - NavItem/NavGroup 타입 + NAV_GROUPS 상수 (아이콘 className 파라미터화)
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| config/nav.tsx | 신규 생성 | Sidebar, MobileNav가 import |
| Sidebar.tsx | 직접 수정 | 내부 배열 제거, import 교체 |
| MobileNav.tsx | 직접 수정 | 내부 배열 제거, 렌더링 로직 변경 |

### Side Effect 위험
- 위험 1: 아이콘 크기 불일치 — Sidebar(`w-4 h-4`)와 MobileNav(`w-5 h-5`)에서 다른 크기 사용
  - 대응: 아이콘을 `(className: string) => ReactNode` 함수로 정의, 렌더링 시 className 전달
- 위험 2: MobileNav 렌더링 구조 변경 — 그룹 없는 flat 배열에서 그룹 기반으로 변경 가능
  - 대응: `NAV_GROUPS.flatMap(g => g.items)`로 기존과 동일한 flat 구조 유지

### 참고할 기존 패턴
- `Sidebar.tsx` lines 22-66: 현재 `NavItem`, `NavGroup` 인터페이스 + `NAV_GROUPS` 배열 정의
- `MobileNav.tsx` lines 21-33: 현재 `MOBILE_NAV` flat 배열 정의
- 아이콘: `lucide-react` 사용 (ArrowLeftRight, Droplets, Landmark 등)

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| config/nav.tsx | 공유 상수 파일 생성 | ✅ OK |
| Sidebar.tsx | 내부 배열 제거 + import 교체 | ✅ OK |
| MobileNav.tsx | 내부 배열 제거 + import 교체 + Yield 추가 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| NAV_GROUPS 공유 상수 | ✅ nav.tsx | OK |
| Sidebar import 교체 | ✅ Sidebar.tsx | OK |
| MobileNav import 교체 + Yield | ✅ MobileNav.tsx | OK |
| 아이콘 className 파라미터화 | ✅ nav.tsx에서 처리 | OK |

### 검증 통과: ✅

---

→ 다음: [Step 03: useYieldVaults 네임드 매핑](step-03-yield-vaults.md)
