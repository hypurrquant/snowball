# Changelog

### v0.5.0 - DDD 4계층 구조 리팩토링 (2026-03-06)
- **구조 재배치**: flat src/ → core/shared/domains/app 4계층 DDD 아키텍처 적용
- **core (8파일)**: React-free 순수 로직 — abis, config/addresses, config/chain
- **shared (27파일)**: React 포함 공통 기능 — UI 컴포넌트, hooks, lib, layout, providers
- **domains (11파일)**: 비즈니스 로직 — trade, defi/lend, defi/yield, options
- **import 갱신**: ~140개 import 경로를 새 alias(@/core/*, @/shared/*, @/domains/*, @/app/*)로 일괄 변환
- **의존성 규칙 적용**: core←shared←domains←app 단방향, cross-domain import 금지
