# Snowball Documentation Index

> 모든 문서의 버전 및 상태를 추적하는 인덱스
> Last updated: 2026-03-06

---

## 문서 목록

### 설계 문서 (Design) — `design/`

| 문서 | 버전 | 상태 | 설명 |
|------|------|------|------|
| [DESIGN_TOKENOMICS_V2.md](design/DESIGN_TOKENOMICS_V2.md) | v0.3.0 | **Draft** | Buyback & Burn + Utility (HYPE 모델) |
| [DESIGN_FRONTEND.md](design/DESIGN_FRONTEND.md) | v0.2.0 | Draft | 통합 프론트엔드 IA, 페이지 설계, Hooks, 디자인 시스템 |
| [DESIGN_OPTIONS.md](design/DESIGN_OPTIONS.md) | v0.2.0 | Draft | BTC 바이너리 옵션, Oracle, FastAPI 백엔드, Meta-tx Relayer |

### SSOT 문서 (Single Source of Truth) — `ssot/`

| 문서 | 버전 | 상태 | 설명 |
|------|------|------|------|
| [SSOT_LIQUITY.md](ssot/SSOT_LIQUITY.md) | v1.0.0 | Active | Liquity V2 포크 — 주소, 토큰, 브랜치 |
| [SSOT_MORPHO.md](ssot/SSOT_MORPHO.md) | v1.0.0 | Active | Morpho Blue 포크 — 주소, 마켓, 오라클 |
| [SSOT_ALGEBRA_deprecated.md](ssot/SSOT_ALGEBRA_deprecated.md) | v1.0.0 | **Deprecated** | DEX SSOT — v0.4.0에서 Uniswap V3로 전환됨 |
| [SSOT_ERC8004.md](ssot/SSOT_ERC8004.md) | v1.0.0 | Active | ERC-8004 에이전트 시스템 — ID, 레퓨테이션 |
| [SSOT_USC.md](ssot/SSOT_USC.md) | v1.0.0 | Active | Creditcoin USC — 크로스체인 오라클, 증명 검증 |
| [DEPLOY_ADDRESSES_UPDATE.md](ssot/DEPLOY_ADDRESSES_UPDATE.md) | v1.0.0 | Active | 최신 배포 주소 및 온체인 테스트 결과 |

### 가이드 문서 (Guide) — `guide/`

| 문서 | 버전 | 상태 | 설명 |
|------|------|------|------|
| [PROJECT_OVERVIEW.md](guide/PROJECT_OVERVIEW.md) | v1.0.0 | Active | 프로젝트 전체 개요 |
| [OPERATIONS.md](guide/OPERATIONS.md) | v0.3.0 | Active | 전체 운영 플로우, 기능 상세, 유저 플로우, 배포/모니터링 |
| [HANDOFF.md](guide/HANDOFF.md) | v1.0.0 | Active | 프로토콜 인수인계 문서 |
| [OP.md](guide/OP.md) | v1.0.0 | Active | 패키지별 운영 가이드 |
| [DEMO_SCENARIO.md](guide/DEMO_SCENARIO.md) | v1.0.0 | Active | 5-7분 데모 시나리오 |

### 보안 문서 (Security) — `security/`

| 문서 | 버전 | 상태 | 설명 |
|------|------|------|------|
| [SECURITY_AUDIT.md](security/SECURITY_AUDIT.md) | v2.0.0 | Active | 종합 보안 감사 보고서 |
| [audit_report_v2.md](security/audit_report_v2.md) | v2.0.0 | Active | 자동화 감사 리포트 |
| [CONTRACT_FIX_PLAN.md](security/CONTRACT_FIX_PLAN.md) | v1.0.0 | Active | 컨트랙트 수정 계획 |
| [SECURITY_REMEDIATION.md](security/SECURITY_REMEDIATION.md) | v1.0.0 | Active | 보안 취약점 대응 가이드 |
| [SECURITY_PATCH_NOTES.md](security/SECURITY_PATCH_NOTES.md) | v1.0.0 | Active | 보안 패치 노트 |
| [FIXES_APPLIED.md](security/FIXES_APPLIED.md) | v1.0.0 | Active | 적용된 수정사항 기록 |

### 분석 보고서 (Report) — `report/`

| 문서 | 버전 | 상태 | 설명 |
|------|------|------|------|
| [REPORT-HISTORY.md](report/REPORT-HISTORY.md) | — | Active | 리포트 생성 히스토리 |
| [analysis.md](report/analysis.md) | v1.0.0 | Active | 프로토콜 액션 카탈로그 |
| [frontend-gap-analysis.md](report/frontend-gap-analysis.md) | v1.0.0 | Active | 프론트엔드 GAP 분석 |
| [PROTOCOL_INTEGRATION_REPORT.md](report/PROTOCOL_INTEGRATION_REPORT.md) | v1.0.0 | Active | 프로토콜 통합 운영 최적화 보고서 |

---

## 아카이브 (Archive) — `archive/`

더 이상 유지보수하지 않는 문서들.

| 문서 | 상태 | 설명 |
|------|------|------|
| [DESIGN_TOKENOMICS.md](archive/DESIGN_TOKENOMICS.md) | Deprecated | sSNOW 복리 모델 (v0.3.0으로 대체됨) |
| [FRONTEND_HANDOFF.md](archive/FRONTEND_HANDOFF.md) | Archive | Gemini 핸드오프용 프론트엔드 스펙 |
| [FRONTEND_PROMPT.md](archive/FRONTEND_PROMPT.md) | Archive | 프론트엔드 구현 프롬프트 |
| [FRONTEND_VERSION_MIGRATION.md](archive/FRONTEND_VERSION_MIGRATION.md) | Archive | 프론트엔드 버전 마이그레이션 |
| [TASK_YIELD_VAULT_FRONTEND.md](archive/TASK_YIELD_VAULT_FRONTEND.md) | Archive | Yield Vault 프론트엔드 태스크 |
| [UPDATE_YIELD_VAULT_20260227.md](archive/UPDATE_YIELD_VAULT_20260227.md) | Archive | Yield Vault 업데이트 기록 |
| [v0.1.0/](archive/v0.1.0/) | Archive | 초기 설계 문서 스냅샷 (2026-02-25) |

---

## 버전 규칙

```
v{MAJOR}.{MINOR}.{PATCH}

MAJOR: 구조 변경, 호환 불가 (컨트랙트 재배포 등)
MINOR: 기능 추가, 섹션 추가
PATCH: 오타, 주소 수정, 소규모 업데이트
```

## 상태 정의

| 상태 | 설명 |
|------|------|
| **Draft** | 초안. 리뷰/승인 전. 변경 가능성 높음 |
| **Review** | 리뷰 중. 피드백 반영 단계 |
| **Active** | 승인됨. 현재 운영 기준 문서 |
| **Archive** | 더 이상 유지보수하지 않음. 참고용 |
| **Deprecated** | 폐기. 새 문서로 대체됨 |

---

## Changelog

전체 변경 이력은 [CHANGELOG.md](CHANGELOG.md) 참조.
