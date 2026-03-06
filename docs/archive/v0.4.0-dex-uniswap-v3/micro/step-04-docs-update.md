# Step 04: 문서 Algebra → Uniswap V3 업데이트

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (git revert)
- **선행 조건**: Step 01~03 (코드 변경 완료 후 문서 정리)

---

## 1. 구현 내용 (design.md 기반)

### 텍스트 치환 (8개 파일)
| 파일 | Algebra 참조 수 | 변경 내용 |
|------|----------------|----------|
| `docs/guide/OPERATIONS.md` | ~6곳 | 아키텍처 다이어그램, 배포 명령어, 컨트랙트 목록에서 Algebra→Uniswap V3 |
| `docs/ssot/DEPLOY_ADDRESSES_UPDATE.md` | ~6곳 | 주소/검증 테이블에서 Algebra→Uniswap V3 |
| `docs/security/SECURITY_AUDIT.md` | ~12곳 | "Faithful Fork" 섹션 리라이트 |
| `docs/report/abi-audit.md` | ~12곳 | DEX 섹션 교체 |
| `docs/design/DESIGN_TOKENOMICS_V2.md` | ~2곳 | DEX 수수료 모델 |
| `docs/LAST_TASK.md` | ~1곳 | DN Token DEX 풀 |
| `docs/INDEX.md` | ~1곳 | SSOT_ALGEBRA 행 제거/교체 |
| `docs/CHANGELOG.md` | ~1곳 | SSOT_ALGEBRA 참조 |

### v0.3.0 phase 문서 주석 추가
- `docs/phases/v0.3.0-abi-correction/micro/step-04-dex-abi.md`: Algebra 참조에 "(deprecated → v0.4.0에서 Uniswap V3로 전환)" 주석 추가

### 변경하지 않는 문서
- `docs/archive/` — frozen snapshot
- `docs/phases/v0.4.0-dex-uniswap-v3/` — 현재 phase 문서 (Algebra 참조는 변환 맥락 설명용)

## 2. 완료 조건
- [ ] 대상 8개 파일에서 `Algebra` 텍스트 0건 (F22)
- [ ] v0.3.0 step-04 문서에 deprecated 주석 존재 (E4)
- [ ] `docs/archive/` 내부는 변경하지 않음 (E3)
- [ ] 최종 `next build` 재확인 (N2) — 문서 변경이 빌드에 영향 없음 확인

## 3. 롤백 방법
- `git checkout -- docs/guide/OPERATIONS.md docs/ssot/DEPLOY_ADDRESSES_UPDATE.md docs/security/SECURITY_AUDIT.md docs/report/abi-audit.md docs/design/DESIGN_TOKENOMICS_V2.md docs/LAST_TASK.md docs/INDEX.md docs/CHANGELOG.md`
- 영향 범위: 8~9개 문서 파일

---

## Scope

### 수정 대상 파일
```
docs/
├── guide/OPERATIONS.md             # Algebra→Uniswap V3 치환
├── ssot/DEPLOY_ADDRESSES_UPDATE.md # Algebra→Uniswap V3 치환
├── security/SECURITY_AUDIT.md      # Faithful Fork 섹션 리라이트
├── report/abi-audit.md             # DEX 섹션 교체
├── design/DESIGN_TOKENOMICS_V2.md  # DEX 수수료 모델
├── LAST_TASK.md                    # DN Token DEX 풀
├── INDEX.md                        # SSOT_ALGEBRA 행
├── CHANGELOG.md                    # SSOT_ALGEBRA 참조
└── phases/v0.3.0-abi-correction/
    └── micro/step-04-dex-abi.md    # deprecated 주석 추가
```

### 신규 생성 파일
없음

### 의존성 분석
없음 — 문서 변경만

### Side Effect 위험
없음 — 문서 텍스트 치환만

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| OPERATIONS.md | Algebra ~6곳 | ✅ OK |
| DEPLOY_ADDRESSES_UPDATE.md | Algebra ~6곳 | ✅ OK |
| SECURITY_AUDIT.md | Algebra ~12곳 | ✅ OK |
| abi-audit.md | Algebra ~12곳 | ✅ OK |
| DESIGN_TOKENOMICS_V2.md | Algebra ~2곳 | ✅ OK |
| LAST_TASK.md | Algebra ~1곳 | ✅ OK |
| INDEX.md | SSOT_ALGEBRA ~1곳 | ✅ OK |
| CHANGELOG.md | SSOT_ALGEBRA ~1곳 | ✅ OK |
| step-04-dex-abi.md | deprecated 주석 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| 대상 8파일 Algebra 치환 | ✅ | OK |
| v0.3.0 deprecated 주석 | ✅ | OK |

### 검증 통과: ✅

---

→ 완료 후: `tsc --noEmit` + `next build` 최종 검증
