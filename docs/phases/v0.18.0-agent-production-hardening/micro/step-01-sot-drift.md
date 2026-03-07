# Step 01: AgentVault 주소 SoT 드리프트 해결

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: 가능 (git revert)
- **선행 조건**: 없음

---

## 1. 구현 내용 (design.md 기반)

- `scripts/verify-agent-vault.ts` 작성: eth_getCode + getDelegatedUsers + getPermNonce 호출로 `0x7d3f...` 온체인 검증
- 검증 통과 시 canonical 확정. tx hash 확보 시도 (블록 탐색기 / git log)
- tx hash 미확보 시 재배포 경로 전환 (design.md 분기 정책)
- 동기화 대상 파일 업데이트 (canonical 주소로 통일)
- `docs/guide/deploy-history.md`에 provenance 5개 필드 기록

## 2. 완료 조건
- [ ] (F22) `scripts/verify-agent-vault.ts` 실행 시 `0x7d3f...`에 대해 eth_getCode 존재 + getDelegatedUsers/getPermNonce 정상 응답
- [ ] (F22) `packages/core/src/config/addresses.ts`의 AgentVault 주소가 검증된 canonical 주소
- [ ] (F23) `packages/liquity/deployments/addresses-102031.json`의 AgentVault 주소가 canonical과 일치
- [ ] (F24) `packages/agent-runtime/src/config.ts`의 AgentVault 주소가 canonical과 일치
- [ ] (F25) `docs/ssot/SSOT_ERC8004.md`의 AgentVault 주소가 canonical과 일치
- [ ] (F26) `docs/guide/deploy-history.md`에 contract address, tx hash, block number, 확인 시점, ABI 버전 5개 필드 기록
- [ ] 관련 SSOT 문서(SSOT_LIQUITY.md, SSOT_MORPHO.md), OPERATIONS.md, .claude/skills 주소 동기화

## 3. 롤백 방법
- `git revert` 로 주소 파일 원복. 스크립트 삭제
- 영향 범위: 주소 설정 파일 + 문서. 코드 로직 변경 없음

---

## Scope

### 수정 대상 파일
```
packages/
├── core/src/config/addresses.ts           # 수정 - canonical 확인 (이미 0x7d3f)
├── liquity/deployments/addresses-102031.json  # 수정 - 0xb944→0x7d3f 동기화
└── agent-runtime/src/config.ts            # 수정 - canonical 확인 (이미 0x7d3f)

docs/
├── ssot/SSOT_ERC8004.md                   # 수정 - 0xb944→0x7d3f 동기화
├── ssot/SSOT_LIQUITY.md                   # 수정 - 0xf8e3→0x7d3f 동기화
├── ssot/SSOT_MORPHO.md                    # 수정 - 0xf8e3→0x7d3f 동기화
├── guide/deploy-history.md                # 수정 - provenance 필드 추가
└── guide/OPERATIONS.md                    # 수정 - 0xf8e3→0x7d3f 동기화

.claude/skills/defi-simulation/contracts.md  # 수정 - 0xf8e3→0x7d3f 동기화
```

### 신규 생성 파일
```
scripts/
└── verify-agent-vault.ts                  # 신규 - 온체인 검증 스크립트
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| packages/core/config | 직접 수정 | canonical SoT |
| FE hooks (7개) | 간접 영향 | config re-export 통해 자동 반영 |
| agent-runtime capabilities | 간접 영향 | config.ts 통해 자동 반영 |

### Side Effect 위험
- 주소를 잘못 변경하면 Agent 전체 기능(deposit, withdraw, permission) 중단
- 대응: 온체인 검증 스크립트로 사전 확인 후 변경

### 참고할 기존 패턴
- `scripts/deploy-agent-vault-v2.ts`: viem PublicClient + readContract 패턴
- `docs/guide/deploy-history.md`: 기존 v2 배포 기록 포맷

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| addresses.ts | F22 canonical 검증 | OK |
| addresses-102031.json | F23 동기화 | OK |
| config.ts | F24 동기화 | OK |
| SSOT_ERC8004.md | F25 동기화 | OK |
| SSOT_LIQUITY/MORPHO.md | 추가 동기화 대상 | OK |
| OPERATIONS.md | 추가 동기화 대상 | OK |
| contracts.md (.claude) | 추가 동기화 대상 | OK |
| deploy-history.md | F26 provenance | OK |
| verify-agent-vault.ts | F22 검증 도구 | OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| 온체인 검증 | verify-agent-vault.ts | OK |
| canonical 동기화 | 9개 파일 | OK |
| provenance 기록 | deploy-history.md | OK |

### 검증 통과: 확인

---

> 다음: [Step 02: 환경변수 템플릿](step-02-env-template.md)
