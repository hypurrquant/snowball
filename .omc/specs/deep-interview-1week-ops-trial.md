# Deep Interview Spec: 1주일 프로토콜 운영 트라이얼

## Metadata
- Interview ID: 1week-ops-trial-20260319
- Rounds: 6
- Final Ambiguity Score: 19.0%
- Type: brownfield
- Generated: 2026-03-19
- Threshold: 20%
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.85 | 35% | 0.298 |
| Constraint Clarity | 0.80 | 25% | 0.200 |
| Success Criteria | 0.80 | 25% | 0.200 |
| Context Clarity | 0.75 | 15% | 0.113 |
| **Total Clarity** | | | **0.810** |
| **Ambiguity** | | | **19.0%** |

## Goal

1주일간 Snowball Protocol을 실제 운영하여 운영 프로세스(Oracle, Emission, Market Making, 모니터링)를 검증한다. 모든 운영 항목을 Docker + 크론 기반으로 전량 자동화하여, 사람 개입 없이 프로토콜이 지속적으로 동작할 수 있는지 확인한다.

## 자동화 파이프라인 (4개 모듈)

### 1. Oracle 가격 업데이트
- **주기:** 5분마다
- **방식:** Docker 컨테이너 + 크론잡
- **동작:** 외부 가격 소스에서 wCTC, lstCTC, sbUSD 가격 조회 → CreditcoinOracle.setPrice() TX 전송
- **가격 소스:** CoinGecko / DEX 온체인 TWAP / 수동 설정 (CTC 가격은 외부 거래소 참조)
- **스케일:** 1e36 (Morpho Blue 표준)
- **모니터링:** 업데이트 성공/실패 로깅, 연속 실패 시 알림

### 2. Emission 인센티브 생성
- **주기:** 일 1회 (24시간마다)
- **방식:** 크론 스크립트
- **동작:** SnowballStaker.createIncentive() 호출 — 전략적 풀(sbUSD/USDC 등)에 emission 배분
- **재원:** 프로토콜 트레저리 (deployer 계정)
- **토큰 승인:** 인센티브 생성 전 reward 토큰 approve 필요

### 3. Market Making (팀 LP 공급)
- **주기:** 초기 공급 1회 + 일별 리밸런스 체크
- **방식:** 크론 스크립트
- **동작:** 주요 풀(sbUSD/USDC, wCTC/USDC, lstCTC/wCTC)에 유동성 공급
- **리밸런스:** 가격 변동 시 포지션 범위 이탈 여부 확인, 필요 시 재공급
- **제한:** 시뮬레이션 규칙 — 각 토큰 보유량의 최대 5%

### 4. KPI 모니터링
- **주기:** 1시간마다
- **방식:** NestJS 서버 기존 크론 + 추가 수집
- **수집 항목:**
  - TVL (풀별, 전체)
  - 트랜잭션 수 / 볼륨
  - sbUSD 총 유통량
  - Oracle 업데이트 성공률
  - Staker 인센티브 상태 (참여자 수, 보상 잔액)

## Constraints
- **기간:** 7일 (2026-03-20 ~ 2026-03-27 예정)
- **환경:** Creditcoin Testnet (chainId: 102031)
- **자동화:** Docker + 크론 기반, 전량 자동
- **계정:** deployer 계정 사용 (scripts/simulation-accounts.json)
- **가격 소스:** 외부 API 연동 필요 (CTC 시세)
- **기존 인프라:** NestJS 서버(포트 3001), Next.js 프론트(포트 3005) 운영 중

## Non-Goals
- 실사용자 유치 (이번은 내부 검증용)
- Competition 시스템 구현 (별도 스펙)
- 메인넷 배포
- Fee Sharing 메커니즘 구현

## Acceptance Criteria
- [ ] Oracle이 7일간 5분 간격으로 가격 업데이트 성공 (99%+ 업타임)
- [ ] Staker에 Emission 인센티브가 일 1회 자동 생성됨
- [ ] LP가 인센티브에 스테이킹하여 보상을 받을 수 있음
- [ ] 팀이 주요 3개 풀에 LP 공급, 유동성 유지
- [ ] KPI 데이터 (TVL, 트랜잭션) 1시간 단위 수집 확인
- [ ] Docker 컨테이너로 패키징되어 단일 `docker-compose up`으로 실행 가능
- [ ] 7일간 크리티컬 에러 없이 운영 지속

## 구현 필요 항목

### 새로 만들어야 하는 것
1. **Oracle 업데이터 스크립트** — `scripts/ops/oracle-updater.ts`
   - 외부 가격 소스 조회 → CreditcoinOracle.setPrice() TX
   - 에러 핸들링 + 로깅

2. **Emission 크론 스크립트** — `scripts/ops/emission-cron.ts`
   - SnowballStaker.createIncentive() 일 1회 호출
   - reward 토큰 approve + incentive 생성

3. **MM 리밸런스 스크립트** — `scripts/ops/mm-rebalance.ts`
   - LP 포지션 상태 확인 + 필요 시 재공급

4. **Docker Compose** — `docker-compose.ops.yml`
   - Oracle updater (5분 크론)
   - Emission cron (24시간)
   - MM rebalance (24시간)
   - NestJS 서버 (모니터링)

5. **가격 소스 어댑터** — `scripts/ops/price-source.ts`
   - CoinGecko / Binance API에서 CTC 가격 조회
   - sbUSD = $1 고정, lstCTC = wCTC * 1.04 (스테이킹 비율)

### 기존 활용
- `scripts/simulation-accounts.json` — deployer 키
- `apps/server/` — TVL/볼륨 수집 이미 동작
- `packages/core/src/abis/` — Oracle, Staker ABI
- `packages/core/src/config/addresses.ts` — 컨트랙트 주소

## Interview Transcript
<details>
<summary>Full Q&A (6 rounds)</summary>

### Round 1
**Q:** 1주일 운영의 목적은?
**A:** 운영 프로세스 검증 (emission, oracle, MM 실제 테스트 + 문제점 발견)
**Ambiguity:** 68.8%

### Round 2
**Q:** "검증됐다"고 판단하려면?
**A:** 전체 파이프라인 동작 (Oracle + Emission + MM + 모니터링)
**Ambiguity:** 55.8%

### Round 3
**Q:** Oracle 운영 방식은?
**A:** Docker + 크론으로 자동 업데이트, 가격 소스 필요
**Ambiguity:** 45.8%

### Round 4 (CONTRARIAN)
**Q:** 나머지도 자동화? 1주일이면 수동으로 충분하지 않나?
**A:** 전량 자동화
**Ambiguity:** 36.5%

### Round 5
**Q:** 각 항목별 자동화 주기는?
**A:** Oracle 5분, Emission 일 1회, MM 일 1회 리밸런스, 모니터링 1시간
**Ambiguity:** 27.8%

### Round 6 (SIMPLIFIER)
**Q:** 4가지 성공 기준이면 충분?
**A:** 맞다 — 이 4가지면 충분
**Ambiguity:** 19.0%

</details>
