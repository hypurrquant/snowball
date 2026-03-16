# 포크/적용 프로토콜 및 라이선스 현황

> Snowball Protocol이 포크·적용한 외부 프로토콜 목록과 라이선스 정리

---

## 개요

Snowball Protocol은 검증된 DeFi 프로토콜을 Creditcoin 테스트넷(chainId: 102031)에 포크·배포하여 통합 DeFi 플랫폼을 구축한다. 본 문서는 각 프로토콜의 원본 출처, 라이선스, 적용 수준, 주의사항을 정리한다.

## 프로토콜 총괄표

| # | 원본 프로토콜 | Snowball 명칭 | 카테고리 | 라이선스 | 적용 수준 | 소스 경로 |
|---|-------------|-------------|---------|---------|----------|----------|
| 1 | Uniswap V3 | DEX (Trade) | AMM / DEX | BUSL-1.1 (Change Date 2023-04-01 → GPL-2.0+) | 최소 | npm 패키지 |
| 2 | Liquity V2 (Bold) | Borrow / Earn | CDP 대출 | BUSL-1.1 → 2027-09-01 GPL-2.0+ | 대폭 수정 | `packages/liquity/` |
| 3 | Morpho Blue | SnowballLend | 격리형 대출 마켓 | GPL-2.0+ 또는 BUSL (듀얼) | 중간 수정 | `packages/morpho/` |
| 4 | Beefy Finance | Yield Vaults | 수익 농사 / 볼트 | MIT (프론트엔드) | 대폭 수정 | `packages/yield/` |
| 5 | ERC-8004 | Agent | AI 에이전트 | EIP Draft (CC0) | 자체 구현 | `packages/erc-8004/` |
| 6 | DN Crosschain | Bridge (DN) | 크로스체인 브릿지 | 자체 설계 | 자체 구현 | `packages/usc-bridge/` |
| 7 | (자체 설계) | Options | 바이너리 옵션 | 자체 설계 | MVP 제외 | `packages/options/` |

## 라이선스 상세

### 1. Uniswap V3 — BUSL-1.1

| 항목 | 내용 |
|------|------|
| **원본 저장소** | [Uniswap/v3-core](https://github.com/Uniswap/v3-core?tab=License-1-ov-file#readme), [Uniswap/v3-periphery](https://github.com/Uniswap/v3-periphery) |
| **라이선스** | **BUSL-1.1** (Business Source License 1.1) |
| **Licensor** | Uniswap Labs |
| **Licensed Work** | Uniswap V3 Core, (c) 2021 Uniswap Labs |
| **Additional Use Grant** | `v3-core-license-grants.uniswap.eth` (ENS) |
| **Change Date** | 2023-04-01 (또는 `v3-core-license-date.uniswap.eth` 지정일) |
| **Change License** | GPL-2.0+ |
| **현재 상태** | Change Date(2023-04-01) 경과 → GPL-2.0+로 자동 전환됨 |
| **v3-periphery** | GPL-2.0+ (별도 라이선스) |
| **적용 방식** | npm 패키지 직접 사용 (`@uniswap/v3-core@1.0.1`, `@uniswap/v3-periphery@1.4.4`) |
| **수정 사항** | 컨트랙트 자체 수정 없음. Creditcoin 토큰 풀(5개)만 배포 |
| **라이선스 의무** | GPL-2.0+: 파생물 소스 공개 의무. 단, 컨트랙트 미수정이므로 원본 그대로 참조 |

### 2. Liquity V2 (Bold) — BUSL-1.1

| 항목 | 내용 |
|------|------|
| **원본 저장소** | [liquity/bold](https://github.com/liquity/bold) |
| **라이선스** | **BUSL-1.1** (Business Source License 1.1) |
| **Licensor** | Liquity AG |
| **Licensed Work** | Liquity V2 Contracts (core protocol logic), (c) 2024 Liquity AG |
| **Additional Use Grant** | [github.com/liquity/additional-use-grant](https://github.com/liquity/additional-use-grant) 참조 |
| **Change Date** | **2027-09-01** |
| **Change License** | GPL-2.0+ |
| **현재 상태** | BUSL 유효 (2027-09-01까지). 프로덕션 사용 시 Additional Use Grant 확인 필요 |
| **적용 방식** | `packages/liquity/` 에 컨트랙트 소스 포크, Hardhat 빌드 |
| **수정 사항** | 듀얼 브랜치(wCTC/lstCTC), AgentVault 연동, sbUSD 통합, 커스텀 PriceFeed |
| **주의** | BUSL 하에서 non-production use만 무조건 허용. 프로덕션 배포 시 Additional Use Grant 조건 확인 필수 |

### 3. Morpho Blue — GPL-2.0+ 또는 BUSL (듀얼 라이선스)

| 항목 | 내용 |
|------|------|
| **원본 저장소** | [morpho-org/morpho-blue](https://github.com/morpho-org/morpho-blue?tab=License-1-ov-file) |
| **라이선스** | **듀얼 라이선스** — GPL-2.0+ 또는 BUSL 중 선택 가능 |
| **Copyright** | Morpho Association |
| **적용 방식** | `packages/morpho/` 에 Foundry 프로젝트로 포크 |
| **수정 사항** | CreditcoinOracle(1e36 스케일), AdaptiveCurveIRM, 3개 마켓 커스텀 구성 |
| **라이선스 선택** | GPL-2.0+ 선택 시 파생물 소스 공개 의무 |

### 4. Beefy Finance — MIT (SPDX only, LICENSE 파일 없음)

| 항목 | 내용 |
|------|------|
| **원본 저장소** | [beefyfinance/beefy-contracts](https://github.com/beefyfinance/beefy-contracts) |
| **라이선스** | 저장소에 LICENSE 파일 없음. 컨트랙트 소스(e.g. `BeefyVaultV7.sol`)에 `SPDX-License-Identifier: MIT` 명시 |
| **적용 방식** | Vault/Strategy 아키텍처 패턴 차용, `packages/yield/` 에 자체 구현 (Foundry) |
| **수정 사항** | SnowballYieldVault/V2, 커스텀 Strategy (StabilityPool, Morpho), SnowballKeeper |
| **라이선스 의무** | MIT: 저작권 표시 유지. 자유 사용/수정/배포 가능 |
| **비고** | Vault/Strategy 패턴을 참고한 자체 구현에 가까움. 직접 포크가 아닌 아키텍처 차용. 별도 LICENSE 파일이 없어 SPDX 헤더만으로 판단 |

### 5. ERC-8004 — EIP Draft (CC0)

| 항목 | 내용 |
|------|------|
| **표준** | [EIP-8004: Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004) |
| **상태** | **Draft** (Standards Track / ERC) |
| **저자** | Marco De Rossi, Davide Crapis, Jordan Ellis, Erik Reppel |
| **라이선스** | EIP 문서: CC0 (퍼블릭 도메인). 구현은 자체 코드 |
| **적용 방식** | `packages/erc-8004/` 에 표준 기반 자체 구현 |
| **구현 내용** | IdentityRegistry, ReputationRegistry, ValidationRegistry, AgentVault V3 |
| **비고** | EIP 표준 인터페이스 기반 자체 구현. 포크가 아닌 표준 준수 구현 |

### 6. DN Crosschain Bridge — 자체 설계

| 항목 | 내용 |
|------|------|
| **원본** | 자체 설계 (외부 포크 없음) |
| **라이선스** | Snowball 자체 코드 |
| **적용 방식** | `packages/usc-bridge/` 에 Foundry 프로젝트 |
| **구현 내용** | BridgeVault, DNToken, DNBridgeUSC, EvmV1Decoder |
| **대상 체인** | Creditcoin Testnet, Sepolia, USC Testnet |

### 7. Options (바이너리 옵션) — 자체 설계, MVP 제외

| 항목 | 내용 |
|------|------|
| **원본** | 자체 설계 |
| **라이선스** | Snowball 자체 코드 |
| **상태** | **MVP 범위 제외** — 코드 유지하되 수정/개선하지 않음 |
| **적용 방식** | `packages/options/` 에 Foundry 프로젝트 |

## 라이선스 리스크 요약

| 리스크 수준 | 프로토콜 | 사유 | 조치 사항 |
|-----------|---------|------|----------|
| **HIGH** | Liquity V2 | BUSL-1.1 유효 (→2027-09-01). 프로덕션 사용 제한 가능 | Additional Use Grant 조건 검토 필요 |
| **MEDIUM** | Morpho Blue | GPL-2.0+ 선택 시 소스 공개 의무 | 듀얼 라이선스 중 적절한 것 선택, 공개 의무 이행 |
| **MEDIUM** | Uniswap V3 | GPL-2.0+ 전환 완료. 파생물 소스 공개 의무 | 컨트랙트 미수정이므로 리스크 낮음 |
| **LOW** | Beefy | MIT. 자유 사용 가능 | 저작권 표시 유지 |
| **NONE** | ERC-8004 / Bridge / Options | 자체 구현 또는 CC0 표준 | 해당 없음 |

## 결론

- **가장 주의가 필요한 포크**: Liquity V2 (BUSL-1.1, 2027-09-01까지 유효)
- **테스트넷 단계**에서는 BUSL의 "non-production use" 조항에 해당하므로 현재 문제 없음
- **메인넷 배포 시**: Liquity Additional Use Grant 조건을 반드시 확인하고, Morpho의 라이선스 선택을 명시해야 함
- Uniswap V3는 BUSL 만료로 GPL-2.0+ 전환 완료, Beefy는 MIT로 자유 사용 가능

---

**작성일**: 2026-03-15 KST
