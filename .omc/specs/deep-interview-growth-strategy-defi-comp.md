# Deep Interview Spec: Snowball DeFi Yield Competition

## Metadata
- Interview ID: growth-strategy-20260318
- Rounds: 10
- Final Ambiguity Score: 12.5%
- Type: brownfield
- Generated: 2026-03-18
- Threshold: 20%
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.90 | 35% | 0.315 |
| Constraint Clarity | 0.85 | 25% | 0.213 |
| Success Criteria | 0.85 | 25% | 0.213 |
| Context Clarity | 0.90 | 15% | 0.135 |
| **Total Clarity** | | | **0.875** |
| **Ambiguity** | | | **12.5%** |

## Goal

테스트넷 기반 **DeFi 수익 전략 Competition**을 구현하여, Snowball Protocol의 6개 통합 프로토콜(Morpho, Aave, Liquity, Uniswap V3, Beefy, ForwardX)을 활용한 수익 극대화 대회를 개최한다. Faucet으로 초기 자본을 지급하고, 1개월간 포트폴리오 가치 기준으로 순위를 매기며, 상위 참가자에게 OG 배지/역할을 부여한다. 최종 목표는 DAU 100 달성 + 활성 커뮤니티 구축.

## Constraints
- **예산 제한:** 마케팅 예산 최소화, 코드 기반 솔루션 우선
- **테스트넷 환경:** Creditcoin Testnet (chainId: 102031), 실제 자산 없음
- **기존 인프라 활용:** 이미 배포된 6개 프로토콜 + Faucet + Oracle 활용
- **팀 규모 제한:** 개발자 중심으로 구현 가능해야 함
- **메인넷 미정:** ve(3,3) 토크노믹스와 Revenue Sharing은 메인넷 단계로 연기

## Non-Goals
- 메인넷 런칭 (이번 단계 아님)
- ve(3,3) 토큰 시스템 구현 (메인넷 이후)
- Revenue Sharing 스마트 컨트랙트 (메인넷 이후)
- 유료 마케팅/광고 집행
- 모바일 앱 성장 (웹 우선)
- Options 모듈 관련 기능 (MVP 제외)

## Acceptance Criteria
- [ ] Faucet에서 Competition 참가용 토큰 세트(wCTC, lstCTC, sbUSD, USDC) 일괄 지급 가능
- [ ] 사용자가 Competition에 등록(참가) 할 수 있는 UI
- [ ] 실시간 포트폴리오 가치 계산 (잔고 + 예치 포지션 합산, Oracle 가격 기준)
- [ ] 리더보드 페이지: 참가자 순위, 포트폴리오 가치, 수익률(%) 표시
- [ ] Competition 기간 설정 (시작일/종료일) 및 상태 표시 (대기/진행중/종료)
- [ ] 종료 후 최종 순위 확정 및 OG 배지 표시
- [ ] 사용자가 6개 프로토콜 전체를 활용할 수 있음 (Swap, Supply, Borrow, CDP, LP, Vault, Stability Pool)
- [ ] 기본 분석: Competition 참가자 수, 프로토콜별 사용량 통계

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| 테스트넷에서 사용자를 모을 수 없다 | Contrarian: 실제 자산 없이 왜 돌아오나? | 수익 전략 Competition + OG 보상으로 동기부여 가능 |
| 성장 = TVL 키우기 | 핵심 지표가 뭔가? | DAU/MAU가 핵심, TVL은 메인넷 이후 |
| 마케팅 예산이 필수 | 코드로 해결 가능한가? | Faucet + Competition = 코드 기반 성장 가능 |
| ve(3,3) 먼저 구현 필요 | Simplifier: 최소 버전은? | 테스트넷은 Competition, ve(3,3)은 메인넷 |
| 트레이딩 대회 | 사용자 수정 | DeFi 수익 전략 대회 (전체 프로토콜 활용) |

## Technical Context

### 기존 활용 가능 인프라
- **Faucet:** `/faucet` 페이지 이미 구현, 토큰 분배 기능 존재
- **Oracle:** CreditcoinOracle (`price()` 1e36 스케일) — 포트폴리오 가치 계산에 사용. **팀이 직접 운영** (가격 업데이트 주체)
- **Dashboard:** `/dashboard` 페이지 — 포트폴리오 뷰 기존 구현
- **6개 프로토콜:** 모두 테스트넷 배포 완료, 사용 가능
- **NestJS Server:** `apps/server/` — 리더보드 데이터 저장/조회에 활용
- **SQLite DB:** `better-sqlite3` 이미 사용 중 — Competition 데이터 저장

### 신규 구현 필요
1. **Competition 등록/관리 시스템** — 서버 DB(SQLite)에 참가자 지갑 주소 저장, API로 등록/조회
2. **포트폴리오 가치 계산 엔진** — 클라이언트에서 실시간 온체인 조회 (지갑 잔고 + 전체 DeFi 포지션, Oracle 가격 적용)
3. **리더보드 페이지** (`/competition`) — 서버에서 참가자 목록 조회 → 클라이언트에서 각 참가자 포트폴리오 실시간 계산 → 순위 표시
4. **Faucet 확장** — Competition 참가 시 토큰 세트(wCTC, lstCTC, sbUSD, USDC) 일괄 지급
5. **OG 배지 시스템** — 종료 후 상위 참가자에게 OG 배지(Gold/Silver/Bronze) 표시

## Ontology (Key Entities)

| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| User | core domain | wallet address, username, OG status, join date | participates in Competition, has Portfolio |
| Competition | core domain | id, name, start date, end date, status, rules | has many Participants, has Leaderboard |
| Participant | core domain | user, competition, initial portfolio value, current value, rank | belongs to User and Competition |
| Portfolio | core domain | wallet balances, DeFi positions (supply, borrow, LP, vault, stability), total value USD | belongs to User |
| Leaderboard | supporting | competition id, rankings, last updated | belongs to Competition |
| Faucet | supporting | token amounts, cooldown, competition mode | distributes tokens to User |
| OG Badge | supporting | tier (Gold/Silver/Bronze), competition id, awarded date | awarded to User |
| Oracle | external system | token prices (1e36 scale) | used by Portfolio for valuation |
| Protocol (Morpho/Aave/Liquity/DEX/Yield/ForwardX) | external system | positions, balances, APY | used by User for strategies |
| Community | core domain | Discord/Telegram, member count, engagement | grown by Competition |
| Growth Strategy | core domain | phases (testnet comp → mainnet ve33), KPIs (DAU 100) | drives Competition design |

## Ontology Convergence

| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 3 | 3 | - | - | N/A |
| 2 | 4 | 1 | 0 | 3 | 75% |
| 3 | 5 | 1 | 0 | 4 | 80% |
| 4 | 6 | 1 | 0 | 5 | 83% |
| 5 | 8 | 2 | 0 | 6 | 75% |
| 6 | 10 | 2 | 0 | 8 | 80% |
| 7 | 11 | 1 | 0 | 10 | 91% |
| 8 | 11 | 0 | 0 | 11 | 100% |
| 9 | 11 | 0 | 0 | 11 | 100% |
| 10 | 11 | 0 | 0 | 11 | 100% |

## Interview Transcript
<details>
<summary>Full Q&A (8 rounds)</summary>

### Round 1
**Q:** "성장 전략"에서 성장이 의미하는 핵심 지표가 무엇인가요?
**A:** 사용자 수 (MAU/DAU)
**Ambiguity:** 79.4% (Goal: 0.35, Constraints: 0.05, Criteria: 0.10, Context: 0.30)

### Round 2
**Q:** 현재 이 전략을 실행할 때 가장 큰 제약 요소는 뭔가요?
**A:** 예산/자금 제약
**Ambiguity:** 71.2% (Goal: 0.35, Constraints: 0.35, Criteria: 0.10, Context: 0.35)

### Round 3
**Q:** 3개월 후에 "성장 전략이 성공했다"고 판단하려면, 어떤 숫자를 봐야 하나요?
**A:** 커뮤니티를 만들고 싶고 DAU 100 달성이 목표
**Ambiguity:** 54.2% (Goal: 0.55, Constraints: 0.35, Criteria: 0.50, Context: 0.35)

### Round 4 (CONTRARIAN MODE)
**Q:** 테스트넷 상태에서 진짜 사용자(DAU 100)를 모으는 것이 가능한가요?
**A:** 테스트넷에서도 얼리어답터/개발자 커뮤니티 확보 가능
**Ambiguity:** 47.9% (Goal: 0.65, Constraints: 0.35, Criteria: 0.55, Context: 0.45)

### Round 5
**Q:** 어떤 성장 채널을 생각하고 계세요?
**A:** 수익을 공유한다는 프로젝트 모델, ve(3,3) 수익공유 모델
**Ambiguity:** 42.9% (Goal: 0.70, Constraints: 0.45, Criteria: 0.55, Context: 0.50)

### Round 6 (SIMPLIFIER MODE)
**Q:** 테스트넷에서 사용자를 모으기 위해 첫 번째로 구현해야 하는 한 가지는?
**A:** faucet으로 토큰 분배 + comp(대회) 개최
**Ambiguity:** 32.3% (Goal: 0.80, Constraints: 0.60, Criteria: 0.60, Context: 0.65)

### Round 7
**Q:** Competition에서 사용자가 경쟁하는 기준은?
**A:** 포트폴리오 가치 기준
**Ambiguity:** 24.7% (Goal: 0.85, Constraints: 0.65, Criteria: 0.75, Context: 0.70)

### Round 8
**Q:** Competition 실행 타임라인과 수상자 인센티브는?
**A:** 1개월 comp + OG 배지/역할. 트레이딩이 아니라 프로토콜 활용 수익 대회.
**Ambiguity:** 18.5% (Goal: 0.90, Constraints: 0.75, Criteria: 0.80, Context: 0.75)

### Round 9
**Q:** 포트폴리오 가치를 어디서 계산할까요? (서버 스냅샷 vs 클라이언트 실시간)
**A:** 클라이언트에서 실시간 온체인 조회로 계산
**Ambiguity:** 15.8% (Goal: 0.90, Constraints: 0.80, Criteria: 0.80, Context: 0.85)

### Round 10
**Q:** 참가자 지갑 주소 목록을 어디에 저장할까요?
**A:** 서버 DB (SQLite)
**Ambiguity:** 12.5% (Goal: 0.90, Constraints: 0.85, Criteria: 0.85, Context: 0.90)

</details>
