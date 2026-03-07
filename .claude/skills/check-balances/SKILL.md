# Check Balances

시뮬레이션 계정 전체의 ERC20 토큰 보유량을 조회합니다.

## 사용 시기

- "잔고 조회", "잔고 확인", "balance", "밸런스"
- "토큰 보유량", "계정 잔고", "시뮬레이션 계정 잔고"
- "얼마 있어", "토큰 몇 개"

## 실행 방법

아래 스크립트를 실행합니다:

```bash
NODE_PATH=apps/web/node_modules npx tsx scripts/sim-check-balances.ts
```

## 스크립트 위치

`scripts/sim-check-balances.ts`

## 조회 대상

- **계정**: `scripts/simulation-accounts.json`의 Deployer + 8개 페르소나
- **토큰**: CTC(native), wCTC, lstCTC, sbUSD, USDC
- **토큰 주소**: `packages/core/src/config/addresses.ts`의 `TOKENS` 참조

## 출력 형식

계정별 토큰 잔고를 테이블로 출력합니다:

```
Account                      |          CTC |         wCTC |       lstCTC |        sbUSD |         USDC
----------------------------------------------------------------------------------------------------
Deployer                     |       499.92 |   9020000.00 |   3420000.00 |            0 |     20000.00
#1 Whale LP                  |       499.99 |      9791.53 |      9449.87 |            0 |      9250.00
...
```

## 주의사항

- 토큰 주소가 변경되면 `packages/core/src/config/addresses.ts`의 TOKENS를 수정하고, `scripts/sim-check-balances.ts`도 같이 업데이트해야 합니다.
- RPC: `https://rpc.cc3-testnet.creditcoin.network` (Creditcoin Testnet)
