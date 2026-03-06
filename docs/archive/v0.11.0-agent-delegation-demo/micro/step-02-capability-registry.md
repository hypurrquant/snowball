# Step 02: CapabilityRegistry + ToolMapping

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (파일 삭제)
- **선행 조건**: Step 01 (타입 정의)
- **DoD 매핑**: F3, F11

---

## 1. 구현 내용 (design.md 기반)

- `CapabilityRegistry` 클래스 구현 (`src/registry.ts`):
  - `register(cap: Capability)` — capability 등록
  - `list()` — 전체 목록
  - `listExecutable(manifest, snapshot)` — manifest의 allowedCapabilities 중 현재 permission/authorization 기반 필터링
  - **참고**: `buildDemoRegistry()` (4개 capability 등록 팩토리)는 Step 04 이후 Step 07에서 구현
- `buildAnthropicTools()` 함수 (`src/planner/anthropic-tools.ts`):
  - `ToolMapping` 타입: `{ tools: AnthropicTool[], toolToCapability: Map<string, string> }`
  - Capability[] → Claude tools[] 자동 변환 (`cap.id.replace(".", "_")` → tool name)
  - 양방향 매핑 (`"morpho_supply"` ↔ `"morpho.supply"`)

## 2. 완료 조건

- [ ] `registry.ts`에 `CapabilityRegistry` 클래스가 export됨
- [ ] `register()`, `list()`, `listExecutable()` 메서드 존재
- [ ] `listExecutable()`가 snapshot의 permission/authorization 상태를 확인하여 권한 없는 capability를 제외
- [ ] `planner/anthropic-tools.ts`에 `buildAnthropicTools()` 함수가 export됨
- [ ] `ToolMapping` 타입이 `tools`와 `toolToCapability` 필드를 포함
- [ ] `tsc --noEmit` 통과

## 3. 롤백 방법
- `registry.ts`, `planner/anthropic-tools.ts` 삭제

---

## Scope

### 신규 생성 파일
```
packages/agent-runtime/src/
├── registry.ts                    # 신규 — CapabilityRegistry 클래스
└── planner/
    └── anthropic-tools.ts         # 신규 — buildAnthropicTools + ToolMapping
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| types.ts | 직접 import | Capability, PermissionSpec 타입 |
| config.ts | 간접 | listExecutable에서 snapshot 참조 |

### 참고할 기존 패턴
- design.md의 `buildAnthropicTools()` 코드 예시 그대로 구현

## FP/FN 검증

### 검증 체크리스트
- [x] registry.ts — F3 CapabilityRegistry
- [x] anthropic-tools.ts — F11 ToolMapping
- [x] listExecutable — E3 permission 만료 필터링

### 검증 통과: ✅

---

> 다음: [Step 03: Observer — Snapshot 수집](step-03-observer.md)
