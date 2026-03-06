# 리포트 히스토리

> docs/report 문서 생성 이력 관리

---

## 문서 목록

| 생성일시 (KST) | 파일명 | Why (목적) | How (방법) | What (내용) |
|---------------|--------|------------|------------|-------------|
| 2026-03-05 | [analysis.md](./analysis.md) | 프로토콜 전체 기능 파악 필요 | 스마트 컨트랙트 ABI + Codex 토론 | 17개 User Context, 20 Screen IA, BE 캐시 전략, 구현 우선순위 |
| 2026-03-05 | [frontend-gap-analysis.md](./frontend-gap-analysis.md) | 실제 FE 구현과 컨트랙트 기능 간 격차 파악 | 3개 Explore Agent로 전체 라우트/훅/컴포넌트 순회 후 analysis.md 17개 컨텍스트와 1:1 대조 | 페이지별 상세 GAP, 누락 훅 12개, 누락 페이지 9개, 4-Phase 로드맵 |
| 2026-03-06 | [abi-audit.md](./abi-audit.md) | FE ABI가 실제 컨트랙트와 일치하는지 전수 검증 | 4개 병렬 Agent로 5개 ABI 파일 × 9개 패키지 소스코드 1:1 대조 | CRITICAL 16건 (revert), HIGH 7건 (누락), MEDIUM 6건. options.ts 최악, yield.ts 완전 일치 |
