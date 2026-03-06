# 리포트 히스토리

> docs/report 문서 생성 이력 관리

---

## 문서 목록

| 생성일시 (KST) | 파일명 | Why (목적) | How (방법) | What (내용) |
|---------------|--------|------------|------------|-------------|
| 2026-03-05 | [analysis.md](./analysis.md) | 프로토콜 전체 기능 파악 필요 | 스마트 컨트랙트 ABI + Codex 토론 | 17개 User Context, 20 Screen IA, BE 캐시 전략, 구현 우선순위 |
| 2026-03-05 | [frontend-gap-analysis.md](./frontend-gap-analysis.md) | 실제 FE 구현과 컨트랙트 기능 간 격차 파악 | 3개 Explore Agent로 전체 라우트/훅/컴포넌트 순회 후 analysis.md 17개 컨텍스트와 1:1 대조 | 페이지별 상세 GAP, 누락 훅 12개, 누락 페이지 9개, 4-Phase 로드맵 |
| 2026-03-06 | [abi-audit.md](./abi-audit.md) | FE ABI가 실제 컨트랙트와 일치하는지 전수 검증 | 4개 병렬 Agent로 5개 ABI 파일 × 9개 패키지 소스코드 1:1 대조 | CRITICAL 16건 (revert), HIGH 7건 (누락), MEDIUM 6건. options.ts 최악, yield.ts 완전 일치 |
| 2026-03-06 | [user-flow-inventory.md](./user-flow-inventory.md) | 현재 구현된 유저 플로우 전수 파악 | Explore Agent + Codex 5라운드 FP/FN 검증으로 14개 페이지·8개 훅 전수 탐색 | READ 14건, WRITE 9건, ABI 미호출 51개, 보안 관찰 5건, 프로토콜 커버리지 + GAP 4건 |
| 2026-03-06 | [options-fe-analysis.md](./options-fe-analysis.md) | Options Phase 개발 계획 수립을 위한 기반 분석 | FE 코드 전수 조사 + 컨트랙트 소스 대조 + Codex 6라운드 토론 (FP/FN 검증) | 구현 8건/미구현 8건/오류 4건, EIP-712 Order 스키마 확정, FE-BE 스키마 불일치 발견, 14개 작업 DAG + 구현 순서 |
| 2026-03-06 20:27 | [v0-9-0-lending-protocol-unification-asis-tobe.md](./v0-9-0-lending-protocol-unification-asis-tobe.md) | v0.9.0 Lending Protocol Unification 완료 후 ASIS vs TOBE 변화 정리 필요 | v0.9.0 직전/완료 커밋 비교 + 핵심 코드 파일 직접 읽기 + archive phase 문서(README/design/dod/PROGRESS) 대조 | 라우트/DDD 구조/ABI/READ/WRITE/receipt 패턴/UI/fixture/nav/E2E/Codex 리뷰 히스토리까지 11개 축 비교 보고서 |
| 2026-03-06 23:30 | [../scripts/history.md](../scripts/history.md) | scripts/ 파일이 늘어나 용도·이력 파악 필요 | 전체 16개 파일 헤더·git log·코드 분석 | 카테고리별(배포/시뮬레이션/테스트/빌드) 파일 목록 + 상세 설명 + 실행 방법 |
