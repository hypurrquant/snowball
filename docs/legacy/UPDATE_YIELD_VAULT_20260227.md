# Yield Vault Frontend 업데이트 및 배포 주소 반영 완료

**작업 일시:** 2026-02-27
**대상 패키지:** `packages/frontend`

## 1. 프론트엔드 기능 연동 현황
- **Yield Vault 전용 페이지 및 레이아웃 신설 (`/yield`)**
  - 각 Vault의 현황을 한눈에 볼 수 있는 카드 UI(`VaultCard`) 및 예치/출금 통합 다이얼로그(`VaultActionDialog`) 구현.
  - GNB/Sidebar 네비게이션에 Yield 탭(아이콘 포함) 추가.
- **Smart Contract 상호작용 (Wagmi 연동)**
  - `src/abis/yield.ts` 내 Vault 및 Strategy 관련 ABI 추가 (`SnowballYieldVaultABI` 등).
  - `useYieldVaults` 커스텀 훅을 통한 효율적인 온체인 데이터(TVL, 수익률, 사용자 예치금 및 출금 수수료 등) 패치 기능 완성.
  - 사용자가 Vault에 자산을 넣기 전 `want` 토큰의 `approve`를 거쳐 `deposit`을 수행하는 안전한 2-Step 트랜잭션 플로우 적용.

## 2. 배포 컨트랙트 주소 최신화 (`src/config/addresses.ts`)
기존에 배포된 무효화된 Algebra DEX 주소를 갱신하고, 새로 배포된 Yield Vault 실 주소를 반영하여 Creditcoin Testnet과 정상적으로 통신하도록 설정되었습니다.

### 반영된 DEX 주요 주소 (Creditcoin Testnet)
- **Factory:** `0xd478a63345d7cd17881a540e15943919604691f6`
- **Pool Deployer:** `0x1ff0fa39ae0db2c37b400fbbaf234ad6eee3bd86`
- **Router:** `0xd604593426538fd1fa5b2660e3e443fa1ce93411`
- **Dynamic Fee Plugin:** `0x5b0901f4c205fa4a92bbc3fecaef9b0b72ef4246`
- **Position Manager:** `0x54b8584dd202cee8db0fbfa3522f78cb7d9bf6dd`
- **QuoterV2:** `0xeb2b122a28dceaeecb87b745173d6aa3c990d5c0`

### 반영된 Yield Vault 주요 주소 (Creditcoin Testnet)
| Vault 이름 | Vault 주소 | Strategy 주소 | 예치 토큰 |
|---|---|---|---|
| **Stability Pool** | `0xd91035c1c48bd28dc7072f78a0b6a9adf55a38cd` | `0x282d87f4e4f20ad2d38d8570a76b72f8031ac88d` | sbUSD |
| **Morpho sbUSD** | `0x8076a963a86daa86ee8f0929c03d075e2bd62ccf` | `0x5c3f1b8d16abb5114f08ed7d9c6aa2ab425fcfdb` | sbUSD |
| **Morpho wCTC** | `0x5796211d1e317ca07f4f5315b8a47f2f9eb433ea` | `0xd61fc96c85f39199abdee0db5f8676c794620bc9` | wCTC |
| **Morpho USDC** | `0xb5fd93247f0fd8cbf3b8db7963e699e35bc79b97` | `0xb76d6fbc6403d4890202e9c6cd39cecd078ac734` | USDC |

## 3. 검증 결과
- TypeScript 빌드 검사(`tsc --noEmit`) 통과: 타입 및 문법 에러 0건.
- `eth_call` 및 프론트엔드 RPC 데이터 Fetch 검증: 정상적으로 노드 연결되어 1e18(1:1 비율) 등의 데이터를 안정적으로 불러오는 것 확인.

---
> **참고:** 이제 `/yield` 경로로 이동하여 디자인, 로직, 그리고 새롭게 배포된 지갑 트랜잭션을 직접 테스트해 볼 수 있습니다.
