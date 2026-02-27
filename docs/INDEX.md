# Snowball Documentation Index

> 모든 문서의 버전 및 상태를 추적하는 인덱스
> Last updated: 2026-02-28

---

## 문서 목록

### 설계 문서 (Design)

| 문서 | 버전 | 상태 | 설명 |
|------|------|------|------|
| [DESIGN_TOKENOMICS_V2.md](DESIGN_TOKENOMICS_V2.md) | v0.3.0 | **Draft** | Buyback & Burn + Utility (HYPE 모델) |
| [DESIGN_FRONTEND.md](DESIGN_FRONTEND.md) | v0.2.0 | Draft | 통합 프론트엔드 IA, 페이지 설계, Hooks, 디자인 시스템 |
| [DESIGN_OPTIONS.md](DESIGN_OPTIONS.md) | v0.2.0 | Draft | BTC 바이너리 옵션, Oracle, FastAPI 백엔드, Meta-tx Relayer |

### SSOT 문서 (Single Source of Truth)

| 문서 | 버전 | 상태 | 설명 |
|------|------|------|------|
| [SSOT_LIQUITY.md](SSOT_LIQUITY.md) | v1.0.0 | Active | Liquity V2 포크 — 주소, 토큰, 브랜치 |
| [SSOT_MORPHO.md](SSOT_MORPHO.md) | v1.0.0 | Active | Morpho Blue 포크 — 주소, 마켓, 오라클 |
| [SSOT_ALGEBRA.md](SSOT_ALGEBRA.md) | v1.0.0 | Active | Algebra V4 DEX — 주소, 풀, 토큰 |
| [SSOT_ERC8004.md](SSOT_ERC8004.md) | v1.0.0 | Active | ERC-8004 에이전트 시스템 — ID, 레퓨테이션 |
| [SSOT_USC.md](SSOT_USC.md) | v1.0.0 | Active | Creditcoin USC — 크로스체인 오라클, 증명 검증 |

### 운영 문서 (Operations)

| 문서 | 버전 | 상태 | 설명 |
|------|------|------|------|
| [OPERATIONS.md](OPERATIONS.md) | v1.0.0 | Active | 전체 운영 플로우, 기능 상세, 유저 플로우, 배포/모니터링 |
| [DEPLOY_ADDRESSES_UPDATE.md](DEPLOY_ADDRESSES_UPDATE.md) | v1.0.0 | Active | 최신 배포 주소 및 온체인 테스트 결과 |

### 참조 문서 (Reference)

| 문서 | 버전 | 상태 | 설명 |
|------|------|------|------|
| [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) | v1.0.0 | Active | 프로젝트 전체 개요 |

---

## Legacy 문서

`legacy/` 폴더에 보관. 더 이상 유지보수하지 않는 문서들.

| 문서 | 상태 | 설명 |
|------|------|------|
| [DESIGN_TOKENOMICS.md](legacy/DESIGN_TOKENOMICS.md) | Deprecated | sSNOW 복리 모델 (v0.3.0으로 대체됨) |
| [FRONTEND_HANDOFF.md](legacy/FRONTEND_HANDOFF.md) | Archive | Gemini 핸드오프용 프론트엔드 스펙 |
| [FRONTEND_PROMPT.md](legacy/FRONTEND_PROMPT.md) | Archive | 프론트엔드 구현 프롬프트 |
| [FRONTEND_VERSION_MIGRATION.md](legacy/FRONTEND_VERSION_MIGRATION.md) | Archive | 프론트엔드 버전 마이그레이션 |
| [TASK_YIELD_VAULT_FRONTEND.md](legacy/TASK_YIELD_VAULT_FRONTEND.md) | Archive | Yield Vault 프론트엔드 태스크 |
| [UPDATE_YIELD_VAULT_20260227.md](legacy/UPDATE_YIELD_VAULT_20260227.md) | Archive | Yield Vault 업데이트 기록 |
| [v0.1.0/](legacy/v0.1.0/) | Archive | 초기 설계 문서 스냅샷 (2026-02-25) |

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
