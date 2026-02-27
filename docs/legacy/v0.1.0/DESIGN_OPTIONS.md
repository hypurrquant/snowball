# Snowball Options — 바이너리 옵션 프로토콜 설계

> BTC 바이너리 옵션 | CDP 결제 | Meta-Transaction (Gasless) | Snowball Revenue Union 연동
> Version: v0.1.0 | Status: Draft
> Last updated: 2026-02-25
> [INDEX](INDEX.md)

---

## 1. 개요

### 무엇을 만드는가

BTC 가격을 예측하는 **바이너리 옵션 프로토콜**. 유저는 서명만 하고, 트랜잭션 제출과 가스비는 Snowball이 처리합니다.

| 항목 | 값 |
|------|-----|
| 기초 자산 (Underlying) | **BTC** (비트코인 가격) |
| 결제 토큰 | **CDP** |
| 만기 | 60초 / 5분 / 1시간 (선택) |
| 포지션 | Over (상승) / Under (하락) |
| 유저 경험 | **서명만** → 가스비 0 → 원클릭 |
| 네트워크 | Creditcoin |

### 기존 Capture와의 관계

Capture 프로토콜(HyperEVM 바이너리 옵션)의 아키텍처를 기반으로 Creditcoin에 포팅하고, Snowball Revenue Union에 통합합니다.

| 항목 | Capture (기존) | Snowball Options (신규) |
|------|---------------|------------------------|
| 체인 | HyperEVM | Creditcoin |
| 결제 토큰 | USDC | **CDP** |
| 기초 자산 | HYPE | **BTC** |
| 유저 트랜잭션 | Operator 제출 | **EIP-712 서명 + Relayer** |
| 수익 귀속 | 자체 Treasury | **Revenue Union → sSNOW** |
| 가스비 | 유저 부담 | **프로토콜 대납** |

---

## 2. 핵심 아키텍처

### 2-1. 전체 흐름

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ① 유저 (브라우저)                                           │
│     │                                                        │
│     │  BTC Over / Under 선택                                 │
│     │  금액 입력 (CDP)                                       │
│     │  EIP-712 서명 (지갑 팝업)                              │
│     │                                                        │
│     │  ※ 가스비 불필요. 서명만 하면 끝.                      │
│     │                                                        │
│     ▼                                                        │
│  ② Relayer Backend (Snowball 서버)                            │
│     │                                                        │
│     │  서명 검증 (ecrecover)                                 │
│     │  주문 매칭 (Over ↔ Under 페어링)                       │
│     │  트랜잭션 구성 (가스비 CTC로 대납)                     │
│     │  배치 제출 (최대 50개/tx)                               │
│     │                                                        │
│     ▼                                                        │
│  ③ Smart Contract (Creditcoin)                                │
│     │                                                        │
│     │  서명 검증 → 주문 등록                                 │
│     │  CDP 잔고 escrow 잠금                                  │
│     │  라운드 시작/종료 가격 기록                            │
│     │                                                        │
│     ▼                                                        │
│  ④ Settlement Bot                                             │
│     │                                                        │
│     │  BTC 오라클 가격 조회                                  │
│     │  만기 도달 시 자동 정산                                │
│     │  승자: CDP 수령 / 패자: CDP 차감                       │
│     │  수수료 → Revenue Pool → sSNOW                         │
│     │                                                        │
└──────────────────────────────────────────────────────────────┘
```

### 2-2. Meta-Transaction (Gasless) 구조

```
┌─────────────┐     EIP-712 서명      ┌──────────────┐
│   유저 지갑  │ ──────────────────→  │  Relayer API  │
│  (MetaMask)  │   off-chain only     │  (서버)       │
│              │   가스비 0           │              │
└─────────────┘                      └──────┬───────┘
                                            │
                                     가스비 CTC 대납
                                     트랜잭션 제출
                                            │
                                     ┌──────▼───────┐
                                     │  Creditcoin   │
                                     │  Smart        │
                                     │  Contract     │
                                     │              │
                                     │ ecrecover()  │
                                     │ → 서명자 검증 │
                                     │ → 주문 실행   │
                                     └──────────────┘
```

#### EIP-712 서명 데이터

```typescript
const ORDER_TYPEHASH = {
    Order: [
        { name: 'user', type: 'address' },
        { name: 'position', type: 'uint8' },       // 0=Over, 1=Under
        { name: 'amount', type: 'uint256' },        // CDP amount
        { name: 'productId', type: 'uint256' },     // 0=BTC
        { name: 'epoch', type: 'uint256' },         // 라운드 번호
        { name: 'deadline', type: 'uint256' },      // 서명 만료 시간
        { name: 'nonce', type: 'uint256' },         // replay 방지
    ],
}

const domain = {
    name: 'Snowball Options',
    version: '1',
    chainId: 102031,  // Creditcoin
    verifyingContract: optionsContractAddress,
}
```

#### 유저 플로우

```
1. 유저: "BTC 60초 Over, 10 CDP 베팅"
2. 브라우저 → EIP-712 typed data 생성
3. MetaMask 팝업 → "서명" 클릭 (가스비 표시 없음)
4. 서명값(v, r, s) → Relayer API로 전송
5. Relayer: 서명 검증 → 매칭 → 온체인 제출
6. 유저: 60초 후 결과 확인 (CDP 증감)
```

---

## 3. 스마트 컨트랙트 설계

### 3-1. 컨트랙트 구조

```
contracts/
├── SnowballOptions.sol           -- 바이너리 옵션 엔진 (BaseVolStrike 포크)
├── OptionsClearingHouse.sol      -- 유저 CDP 잔고 관리 + escrow
├── OptionsVault.sol              -- LP 풀 (counterparty)
├── OptionsRelayer.sol            -- Meta-tx 서명 검증 + 주문 제출
├── interfaces/
│   ├── ISnowballOptions.sol
│   ├── IOptionsClearingHouse.sol
│   ├── IOptionsVault.sol
│   └── IPriceOracle.sol
└── oracle/
    └── BTCPriceOracle.sol        -- BTC 가격 피드 (Pyth / Chainlink)
```

### 3-2. SnowballOptions.sol (옵션 엔진)

Capture의 `BaseVolStrike`를 기반으로 CDP + BTC + EIP-712 지원.

```solidity
contract SnowballOptions is
    Initializable,
    UUPSUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    // ─── 상수 ───
    uint256 constant PRICE_UNIT = 1e18;     // CDP decimals (18)
    uint256 constant BASE = 10000;          // 100% = 10000
    uint256 constant MAX_COMMISSION_FEE = 5000; // 50% 상한

    // ─── 상태 ───
    IERC20 public cdpToken;                 // CDP 토큰
    IOptionsClearingHouse public clearingHouse;
    IOptionsVault public vault;
    IPriceOracle public oracle;
    address public relayer;                 // OptionsRelayer 주소

    uint256 public commissionFee;           // 수수료율 (e.g. 500 = 5%)
    uint256 public currentEpoch;
    uint256 public roundInterval;           // 60, 300, 3600

    struct Round {
        uint256 startPrice;     // BTC 시작 가격
        uint256 endPrice;       // BTC 종료 가격
        uint256 startTime;
        uint256 endTime;
        bool settled;
    }

    struct FilledOrder {
        uint256 idx;
        uint256 epoch;
        address overUser;
        address underUser;
        uint256 overAmount;     // Over 유저 베팅 금액 (CDP)
        uint256 underAmount;    // Under 유저 베팅 금액 (CDP)
        uint256 entryPrice;     // BTC 진입 가격
        bool isSettled;
    }

    mapping(uint256 => Round) public rounds;
    mapping(uint256 => FilledOrder[]) public epochOrders;

    // ─── 핵심 함수 ───

    /// @notice Relayer가 매칭된 주문 제출
    function submitFilledOrders(
        FilledOrder[] calldata orders
    ) external onlyRelayer {
        for (uint i; i < orders.length; i++) {
            FilledOrder memory o = orders[i];

            // Over 유저 escrow 잠금
            clearingHouse.lockInEscrow(o.overUser, o.overAmount, o.epoch, o.idx);
            // Under 유저 escrow 잠금
            clearingHouse.lockInEscrow(o.underUser, o.underAmount, o.epoch, o.idx);

            epochOrders[o.epoch].push(o);
        }
    }

    /// @notice 라운드 실행 (시작/종료 가격 설정)
    function executeRound(
        bytes calldata priceData
    ) external onlyOperator {
        uint256 btcPrice = oracle.verifyAndGetPrice(priceData, 0); // productId=0 (BTC)

        // 이전 라운드 종료
        if (currentEpoch > 0) {
            rounds[currentEpoch - 1].endPrice = btcPrice;
            rounds[currentEpoch - 1].endTime = block.timestamp;
        }

        // 새 라운드 시작
        rounds[currentEpoch].startPrice = btcPrice;
        rounds[currentEpoch].startTime = block.timestamp;
        currentEpoch++;
    }

    /// @notice 주문 정산
    function settleOrders(
        uint256 epoch,
        uint256[] calldata orderIds
    ) external onlyOperator {
        Round memory round = rounds[epoch];
        require(round.endPrice > 0, "Round not ended");

        for (uint i; i < orderIds.length; i++) {
            _settleOrder(epoch, orderIds[i], round.startPrice, round.endPrice);
        }
    }

    function _settleOrder(
        uint256 epoch,
        uint256 idx,
        uint256 startPrice,
        uint256 endPrice
    ) internal {
        FilledOrder storage order = epochOrders[epoch][idx];
        require(!order.isSettled, "Already settled");

        order.isSettled = true;

        bool isOverWin = endPrice > startPrice;
        bool isTie = endPrice == startPrice;

        if (isTie) {
            // 무승부: 양측 escrow 반환
            clearingHouse.releaseFromEscrow(order.overUser, order.overAmount, epoch, idx, 0);
            clearingHouse.releaseFromEscrow(order.underUser, order.underAmount, epoch, idx, 0);
            return;
        }

        address winner = isOverWin ? order.overUser : order.underUser;
        address loser = isOverWin ? order.underUser : order.overUser;
        uint256 winnerAmount = isOverWin ? order.overAmount : order.underAmount;
        uint256 loserAmount = isOverWin ? order.underAmount : order.overAmount;

        // 수수료 계산 (패자 금액에 적용)
        uint256 fee = (loserAmount * commissionFee) / BASE;

        // 승자: 자기 금액 반환 + 패자 금액 - 수수료
        clearingHouse.releaseFromEscrow(winner, winnerAmount, epoch, idx, 0);
        clearingHouse.settleEscrow(loser, winner, loserAmount, fee, epoch, idx);

        // 수수료 → Revenue Pool
        emit OrderSettled(idx, epoch, winner, loser, loserAmount - fee, fee);
    }
}
```

### 3-3. OptionsRelayer.sol (Meta-Transaction)

```solidity
contract OptionsRelayer is EIP712 {

    // ─── EIP-712 ───
    bytes32 constant ORDER_TYPEHASH = keccak256(
        "Order(address user,uint8 position,uint256 amount,uint256 productId,uint256 epoch,uint256 deadline,uint256 nonce)"
    );

    ISnowballOptions public options;
    IOptionsClearingHouse public clearingHouse;

    mapping(address => uint256) public nonces;  // replay 방지

    struct SignedOrder {
        address user;
        uint8 position;        // 0=Over, 1=Under
        uint256 amount;        // CDP 금액
        uint256 productId;     // 0=BTC
        uint256 epoch;
        uint256 deadline;
        uint256 nonce;
        bytes signature;       // v, r, s
    }

    /// @notice 서명된 주문 배치 제출
    /// @dev Operator(Relayer 서버)만 호출. 가스비는 Operator가 부담.
    function submitSignedOrders(
        SignedOrder[] calldata overOrders,
        SignedOrder[] calldata underOrders
    ) external onlyOperator {
        require(overOrders.length == underOrders.length, "Mismatched pairs");

        FilledOrder[] memory filledOrders = new FilledOrder[](overOrders.length);

        for (uint i; i < overOrders.length; i++) {
            SignedOrder calldata over = overOrders[i];
            SignedOrder calldata under = underOrders[i];

            // 서명 검증
            _verifySignature(over);
            _verifySignature(under);

            // 유효성 검사
            require(over.position == 0 && under.position == 1, "Invalid positions");
            require(over.epoch == under.epoch, "Epoch mismatch");
            require(over.productId == under.productId, "Product mismatch");
            require(block.timestamp <= over.deadline, "Over order expired");
            require(block.timestamp <= under.deadline, "Under order expired");

            // nonce 소비
            nonces[over.user]++;
            nonces[under.user]++;

            // FilledOrder 생성
            filledOrders[i] = FilledOrder({
                idx: i,
                epoch: over.epoch,
                overUser: over.user,
                underUser: under.user,
                overAmount: over.amount,
                underAmount: under.amount,
                entryPrice: 0,  // executeRound에서 설정
                isSettled: false
            });
        }

        // 옵션 엔진에 제출
        options.submitFilledOrders(filledOrders);
    }

    function _verifySignature(SignedOrder calldata order) internal view {
        bytes32 structHash = keccak256(abi.encode(
            ORDER_TYPEHASH,
            order.user,
            order.position,
            order.amount,
            order.productId,
            order.epoch,
            order.deadline,
            order.nonce
        ));

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, order.signature);

        require(signer == order.user, "Invalid signature");
        require(order.nonce == nonces[order.user], "Invalid nonce");
    }
}
```

### 3-4. OptionsClearingHouse.sol (잔고 관리)

Capture의 ClearingHouse를 CDP 토큰으로 변환.

```solidity
contract OptionsClearingHouse is
    Initializable,
    UUPSUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    IERC20 public cdpToken;
    address public revenueDistributor;  // Snowball Revenue Union

    // ─── 유저 잔고 ───
    mapping(address => uint256) public userBalances;

    // ─── Escrow (주문별 잠금) ───
    // epoch → user → orderIdx → amount
    mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public escrow;

    // ─── 수수료 누적 ───
    uint256 public accumulatedFees;

    // ─── 입금 (유저 직접 or Relayer 대행) ───
    function deposit(uint256 amount) external nonReentrant {
        cdpToken.transferFrom(msg.sender, address(this), amount);
        userBalances[msg.sender] += amount;
        emit Deposit(msg.sender, amount);
    }

    // ─── 출금 (유저 직접) ───
    function withdraw(uint256 amount) external nonReentrant {
        require(userBalances[msg.sender] >= amount, "Insufficient balance");
        userBalances[msg.sender] -= amount;
        cdpToken.transfer(msg.sender, amount);
        emit Withdrawal(msg.sender, amount);
    }

    // ─── Escrow 잠금 (옵션 엔진에서 호출) ───
    function lockInEscrow(
        address user,
        uint256 amount,
        uint256 epoch,
        uint256 idx
    ) external onlyProduct {
        require(userBalances[user] >= amount, "Insufficient balance");
        userBalances[user] -= amount;
        escrow[epoch][user][idx] = amount;
    }

    // ─── Escrow 반환 (정산 후) ───
    function releaseFromEscrow(
        address user,
        uint256 amount,
        uint256 epoch,
        uint256 idx,
        uint256 fee
    ) external onlyProduct {
        uint256 escrowed = escrow[epoch][user][idx];
        require(escrowed >= amount, "Escrow insufficient");

        escrow[epoch][user][idx] -= amount;
        userBalances[user] += (amount - fee);
        accumulatedFees += fee;
    }

    // ─── 정산 이전 (패자 → 승자) ───
    function settleEscrow(
        address loser,
        address winner,
        uint256 amount,
        uint256 fee,
        uint256 epoch,
        uint256 idx
    ) external onlyProduct {
        escrow[epoch][loser][idx] -= amount;
        userBalances[winner] += (amount - fee);
        accumulatedFees += fee;
    }

    // ─── 수수료 → Revenue Union 전송 ───
    function flushFeesToRevenue() external {
        uint256 fees = accumulatedFees;
        require(fees > 0, "No fees");
        accumulatedFees = 0;
        cdpToken.transfer(revenueDistributor, fees);
        emit FeeFlushed(fees, revenueDistributor);
    }
}
```

### 3-5. OptionsVault.sol (LP 풀)

트레이더의 counterparty 역할. LP가 CDP를 예치하여 유동성 제공.

```solidity
contract OptionsVault is
    Initializable,
    UUPSUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    IERC20 public cdpToken;
    address public optionsEngine;

    uint256 public totalShares;
    uint256 public totalDeposited;
    uint256 public lockedCollateral;
    uint256 public maxCollateralRatio;     // 8000 = 80%
    uint256 public withdrawalDelay;        // 24 hours
    uint256 public minDeposit;             // 100 CDP

    mapping(address => uint256) public shares;

    struct WithdrawalRequest {
        uint256 shareAmount;
        uint256 requestTime;
        bool pending;
    }
    mapping(address => WithdrawalRequest) public withdrawalRequests;

    // ─── LP 입금 ───
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        require(amount >= minDeposit, "Below minimum");

        cdpToken.transferFrom(msg.sender, address(this), amount);

        uint256 newShares;
        if (totalShares == 0) {
            newShares = amount;
        } else {
            newShares = (amount * totalShares) / totalDeposited;
        }

        shares[msg.sender] += newShares;
        totalShares += newShares;
        totalDeposited += amount;

        emit LPDeposit(msg.sender, amount, newShares);
    }

    // ─── LP 출금 요청 (24h 딜레이) ───
    function requestWithdraw(uint256 shareAmount) external {
        require(shares[msg.sender] >= shareAmount, "Insufficient shares");
        withdrawalRequests[msg.sender] = WithdrawalRequest({
            shareAmount: shareAmount,
            requestTime: block.timestamp,
            pending: true
        });
    }

    // ─── LP 출금 실행 ───
    function executeWithdraw() external nonReentrant {
        WithdrawalRequest storage req = withdrawalRequests[msg.sender];
        require(req.pending, "No pending request");
        require(block.timestamp >= req.requestTime + withdrawalDelay, "Delay not passed");

        uint256 amount = getShareValue(req.shareAmount);
        uint256 available = totalDeposited - lockedCollateral;
        require(amount <= available, "Insufficient available");

        shares[msg.sender] -= req.shareAmount;
        totalShares -= req.shareAmount;
        totalDeposited -= amount;
        req.pending = false;

        cdpToken.transfer(msg.sender, amount);
        emit LPWithdraw(msg.sender, amount, req.shareAmount);
    }

    // ─── 거래 컨트랙트 전용 ───

    function lockCollateral(uint256 amount) external onlyOptionsEngine {
        require(
            lockedCollateral + amount <= (totalDeposited * maxCollateralRatio) / 10000,
            "Exceeds max collateral"
        );
        lockedCollateral += amount;
    }

    function releaseCollateral(uint256 amount) external onlyOptionsEngine {
        lockedCollateral -= amount;
    }

    /// @notice 트레이더 승리 시 LP 손실
    function payWinner(address winner, uint256 amount) external onlyOptionsEngine {
        totalDeposited -= amount;
        lockedCollateral -= amount;
        cdpToken.transfer(winner, amount);
    }

    /// @notice 트레이더 패배 시 LP 이익
    function receiveWinnings(uint256 amount) external onlyOptionsEngine {
        totalDeposited += amount;
        lockedCollateral -= amount;
    }

    // ─── 조회 ───
    function getShareValue(uint256 _shares) public view returns (uint256) {
        if (totalShares == 0) return 0;
        return (_shares * totalDeposited) / totalShares;
    }

    function availableBalance() public view returns (uint256) {
        return totalDeposited - lockedCollateral;
    }
}
```

---

## 4. Relayer Backend 설계

### 4-1. 아키텍처

```
┌──────────────────────────────────────────────────────────┐
│  Relayer Server (Node.js + Express)                       │
│                                                          │
│  ┌─── API Layer ───────────────────────────────────────┐ │
│  │                                                      │ │
│  │  POST /api/options/order     ← 서명된 주문 접수     │ │
│  │  GET  /api/options/balance   ← CDP 잔고 조회        │ │
│  │  GET  /api/options/rounds    ← 라운드 현황          │ │
│  │  GET  /api/options/history   ← 거래 이력            │ │
│  │  WS   /ws/options/price      ← BTC 실시간 가격     │ │
│  │                                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─── Order Matching Engine ───────────────────────────┐ │
│  │                                                      │ │
│  │  1. 서명 검증 (EIP-712 ecrecover)                   │ │
│  │  2. 잔고 확인 (ClearingHouse 조회)                  │ │
│  │  3. Over ↔ Under 매칭 (FIFO 큐)                    │ │
│  │  4. 매칭 완료 → FilledOrder 생성                    │ │
│  │  5. 배치 제출 (50개/tx, Relayer 컨트랙트 호출)      │ │
│  │                                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─── Settlement Worker ───────────────────────────────┐ │
│  │                                                      │ │
│  │  매 라운드 종료 시:                                  │ │
│  │  1. BTC Oracle 가격 조회                             │ │
│  │  2. executeRound(priceData) 호출                     │ │
│  │  3. 미정산 주문 스캔                                 │ │
│  │  4. settleOrders() 배치 호출                         │ │
│  │  5. 결과 로깅 + WebSocket 브로드캐스트               │ │
│  │                                                      │ │
│  │  폴링 주기: 5초 (60초 라운드 기준)                   │ │
│  │                                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─── Gas Manager ────────────────────────────────────┐  │
│  │                                                      │ │
│  │  Operator 지갑 CTC 잔고 모니터링                     │ │
│  │  가스비 추정 → 트랜잭션 최적화                       │ │
│  │  잔고 부족 시 알림                                   │ │
│  │                                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 4-2. 주문 매칭 로직

```
Over Queue:  [Alice 10 CDP] [Bob 5 CDP] [Charlie 20 CDP]
Under Queue: [Dave 10 CDP] [Eve 15 CDP]

매칭 결과:
  Pair 1: Alice(Over 10) ↔ Dave(Under 10)     → 동일 금액
  Pair 2: Bob(Over 5) ↔ Eve(Under 5)          → 부분 매칭

  남은 주문:
  Under Queue: [Eve 10 CDP]  ← 잔여
  Over Queue: [Charlie 20 CDP] ← 미매칭

미매칭 주문 처리:
  Option A: Vault가 counterparty (LP가 반대편)
  Option B: 다음 라운드까지 대기
  Option C: 취소 + 반환

→ 추천: Option A (Vault counterparty)
  매칭 안 된 Over 주문 → Vault가 Under 역할
  매칭 안 된 Under 주문 → Vault가 Over 역할
```

### 4-3. API 엔드포인트

```typescript
// ─── 주문 제출 ───
POST /api/options/order
Body: {
    user: "0x...",
    position: 0,              // 0=Over, 1=Under
    amount: "10000000000000000000",  // 10 CDP (18 decimals)
    productId: 0,             // BTC
    epoch: 42,
    deadline: 1740528000,
    nonce: 7,
    signature: "0x..."        // EIP-712 서명
}
Response: {
    orderId: "uuid-...",
    status: "queued",         // queued → matched → submitted → settled
    matchedWith: null
}

// ─── 잔고 조회 ───
GET /api/options/balance?address=0x...
Response: {
    available: "10000000000000000000",   // 사용 가능 CDP
    inEscrow: "5000000000000000000",     // 잠긴 CDP
    total: "15000000000000000000"
}

// ─── 라운드 현황 ───
GET /api/options/rounds
Response: {
    currentEpoch: 42,
    currentRound: {
        startPrice: "97250.00",      // BTC 시작 가격
        startTime: 1740527940,
        endsIn: 45,                  // 초
        totalOverVolume: "500.00",   // CDP
        totalUnderVolume: "480.00"
    },
    recentRounds: [...]
}

// ─── 실시간 가격 (WebSocket) ───
WS /ws/options/price
Message: {
    type: "price",
    productId: 0,
    price: "97312.45",
    timestamp: 1740527985
}
```

---

## 5. 오라클 설계

### 5-1. BTC 가격 소스

| 소스 | 우선순위 | 특징 |
|------|----------|------|
| **Pyth Network** | 1순위 | 서브초 업데이트, 검증 가능, 수수료 |
| **Chainlink** | 2순위 (fallback) | 안정적, 업데이트 느림 |
| **DEX TWAP** | 비상용 | 자체 DEX 가격 참조 |

### 5-2. 오라클 래퍼

```solidity
contract BTCPriceOracle is IPriceOracle {
    IPyth public pyth;
    AggregatorV3Interface public chainlinkFeed;
    bytes32 public btcPriceFeedId;    // Pyth BTC/USD feed ID

    uint256 public constant MAX_PRICE_AGE = 60;  // 60초 이내 가격만 유효

    function getPrice(uint256 /* productId */) external view returns (uint256) {
        // Pyth 우선
        try pyth.getPriceNoOlderThan(btcPriceFeedId, MAX_PRICE_AGE) returns (PythStructs.Price memory price) {
            return _convertPythPrice(price);
        } catch {}

        // Chainlink fallback
        (, int256 answer,, uint256 updatedAt,) = chainlinkFeed.latestRoundData();
        require(block.timestamp - updatedAt < MAX_PRICE_AGE, "Stale price");
        return uint256(answer) * 1e10;  // 8 decimals → 18 decimals
    }

    function verifyAndGetPrice(
        bytes calldata priceData,
        uint256 /* productId */
    ) external payable returns (uint256) {
        // Pyth 서명 검증 + 가격 추출
        bytes[] memory updateData = new bytes[](1);
        updateData[0] = priceData;
        pyth.updatePriceFeeds{value: msg.value}(updateData);

        PythStructs.Price memory price = pyth.getPriceNoOlderThan(btcPriceFeedId, MAX_PRICE_AGE);
        return _convertPythPrice(price);
    }
}
```

---

## 6. Revenue Union 연동

### 6-1. 수수료 흐름

```
트레이더 주문 정산
    │
    │  커미션 (패자 금액의 5%)
    │
    ▼
OptionsClearingHouse.accumulatedFees
    │
    │  flushFeesToRevenue() (주기적 호출)
    │
    ▼
RevenueDistributor (기존 Snowball)
    │
    ├── 92% → BuybackEngine → SNOW buyback → sSNOW 가치 ↑
    ├── 5%  → Treasury
    └── 3%  → Insurance Fund
```

### 6-2. LP Vault도 Yield Vault Strategy로

OptionsVault 자체를 Yield Vault의 Strategy로 래핑:

```
유저 CDP → Yield Vault (mooVault) → OptionsVault LP
         │
         │  LP 수익 = 트레이더 손실
         │  자동 복리 (harvest fee 4.5%)
         │
         └── harvest fee → Revenue Pool → sSNOW
```

### 6-3. 예상 수익 기여

| 항목 | 일일 | 연간 |
|------|------|------|
| 거래량 (보수적) | $50K | $18.25M |
| 커미션 수수료 (5%) | $2,500 | $912.5K |
| Revenue Pool 기여 (92%) | $2,300 | $839.5K |
| LP Vault harvest fee (4.5%) | 별도 | 별도 |

---

## 7. 프론트엔드 설계

### 7-1. 통합 앱 라우트

```
/options                 ← 옵션 트레이딩 메인
/options/vault           ← LP Vault (유동성 공급)
/options/history         ← 거래 이력
```

### 7-2. 트레이딩 페이지 (/options)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─── BTC Price ───────────────────────────────────────────┐    │
│  │                                                          │   │
│  │  BTC/USD    $97,312.45    ▲ +2.3%                       │   │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │  실시간 BTC 가격 차트 (캔들 or 라인)              │   │   │
│  │  │                                                    │   │   │
│  │  │  ════════════════════════╗                         │   │   │
│  │  │                          ║ ← 현재 가격             │   │   │
│  │  │  ========================╝                         │   │   │
│  │  │                                                    │   │   │
│  │  │  [1M]  [5M]  [1H]  ← 만기 선택                    │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─── Trade Panel ──────────┐  ┌─── Round Info ──────────────┐ │
│  │                           │  │                             │ │
│  │  [  OVER ▲  ] [UNDER ▼ ] │  │  Round #42                  │ │
│  │                           │  │  Expires in: 0:45           │ │
│  │  Amount (CDP)             │  │                             │ │
│  │  ┌──────────────────┐    │  │  Entry Price: $97,312       │ │
│  │  │  10         MAX  │    │  │                             │ │
│  │  └──────────────────┘    │  │  Over Volume:  500 CDP      │ │
│  │                           │  │  Under Volume: 480 CDP      │ │
│  │  Payout: ~1.88x          │  │                             │ │
│  │  Max Win: 8.80 CDP       │  │  ────────────────────       │ │
│  │                           │  │  Your Position:             │ │
│  │  [Place Order]            │  │  Over 10 CDP (pending)      │ │
│  │                           │  │                             │ │
│  │  ※ 서명만 하면 됩니다.   │  │  Last 5 Rounds:             │ │
│  │  가스비는 무료입니다.     │  │  #41 ✅ Over +8.80 CDP     │ │
│  │                           │  │  #40 ❌ Under -10.00 CDP   │ │
│  │  Balance: 150.00 CDP      │  │  #39 ✅ Under +9.40 CDP    │ │
│  │                           │  │  #38 ❌ Over -5.00 CDP     │ │
│  └───────────────────────────┘  │  #37 ✅ Over +4.70 CDP     │ │
│                                  └───────────────────────────┘  │
│                                                                 │
│  ┌─── Recent Trades (All Users) ───────────────────────────┐    │
│  │                                                          │   │
│  │  Time     User      Position  Amount   Result            │   │
│  │  12:34    0xAb..    Over      10 CDP   ✅ +8.80         │   │
│  │  12:34    0xCd..    Under     10 CDP   ❌ -10.00        │   │
│  │  12:33    0xEf..    Over      20 CDP   ⏳ Pending       │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7-3. 프론트엔드 Hooks

```typescript
// ─── 주문 ───
useOptionsOrder()
  → signOrder(position, amount)    // EIP-712 서명 + API 제출
  → orderStatus                    // queued → matched → submitted → settled

// ─── 데이터 ───
useOptionsRounds()                 // 현재/과거 라운드 데이터
useOptionsBTCPrice()               // 실시간 BTC 가격 (WebSocket)
useOptionsBalance()                // CDP 잔고 (available + escrow)
useOptionsHistory()                // 내 거래 이력 + PnL

// ─── Vault (LP) ───
useOptionsVault()                  // LP 풀 상태 (TVL, APY, share price)
useOptionsVaultDeposit()           // LP 입금
useOptionsVaultWithdraw()          // LP 출금 (24h 딜레이)
```

---

## 8. 보안

### 8-1. 리스크 매트릭스

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| Relayer 서버 다운 | High | 다중 Relayer, 유저 직접 제출 fallback |
| 오라클 가격 조작 | Critical | Pyth + Chainlink 이중 검증, 가격 편차 체크 |
| Replay Attack (서명 재사용) | High | nonce 관리 + deadline 필수 |
| 프론트러닝 (MEV) | Medium | 서명 → Relayer 경로로 MEV 노출 최소화 |
| LP 과다 노출 | Medium | maxCollateralRatio 80% 제한 |
| Operator 키 유출 | Critical | 멀티시그, 키 로테이션, 권한 분리 |

### 8-2. 서명 보안

```
EIP-712 서명에 포함되는 필드:
  ├── user         → 서명자 = 주문자 검증
  ├── nonce        → replay 방지 (단조 증가)
  ├── deadline     → 시간 초과 서명 거부
  ├── chainId      → 크로스체인 replay 방지
  └── verifyingContract → 컨트랙트 주소 바인딩
```

### 8-3. Fallback 메커니즘

```
정상 경로:
  유저 서명 → Relayer → 온체인

Relayer 장애 시:
  유저가 직접 submitOrder() 호출 (가스비 CTC 필요)
  → ClearingHouse에 직접 접근 가능
  → 항상 유저가 자금을 인출할 수 있는 탈출구 보장

강제 출금:
  requestForceWithdraw() → 24시간 후 → 유저가 직접 출금
  → Operator 없이도 자금 회수 가능
```

---

## 9. 배포 로드맵

### Phase 1: 컨트랙트 (Week 1-2)
- [ ] Capture 컨트랙트를 Creditcoin용으로 포팅
- [ ] USDC → CDP 토큰 변경
- [ ] HYPE → BTC underlying 변경
- [ ] OptionsRelayer (EIP-712 메타 트랜잭션) 구현
- [ ] BTCPriceOracle (Pyth + Chainlink) 구현
- [ ] Forge 테스트 작성

### Phase 2: Backend (Week 3-4)
- [ ] Relayer API 서버 구축
- [ ] 주문 매칭 엔진 구현
- [ ] Settlement Worker 구현
- [ ] Gas Manager 구현
- [ ] WebSocket BTC 가격 스트림

### Phase 3: Frontend (Week 5-6)
- [ ] /options 트레이딩 UI
- [ ] /options/vault LP UI
- [ ] EIP-712 서명 플로우 (wagmi signTypedData)
- [ ] 실시간 BTC 차트
- [ ] 거래 이력 + PnL

### Phase 4: 통합 (Week 7-8)
- [ ] Revenue Union 연동 (수수료 → sSNOW)
- [ ] Yield Vault Strategy 래핑 (LP → mooVault)
- [ ] 통합 Dashboard에 Options 수익 표시
- [ ] 부하 테스트 + 보안 감사

---

## 10. 기존 Capture와 변경사항 요약

| 항목 | Capture (기존) | Snowball Options (변경) |
|------|---------------|------------------------|
| 체인 | HyperEVM (998) | Creditcoin (102031) |
| 토큰 | USDC (6 dec) | CDP (18 dec) |
| 기초 자산 | HYPE | BTC |
| 오라클 | HyperCore precompile | Pyth + Chainlink |
| 주문 제출 | Operator 직접 | **EIP-712 서명 + Relayer** |
| 가스비 | 유저 부담 가능 | **프로토콜 대납 (Gasless)** |
| 수수료 귀속 | 자체 Treasury | **Revenue Union → sSNOW** |
| LP Vault | 독립 운영 | **Yield Vault Strategy 연동** |
| 업그레이드 | UUPS (유지) | UUPS (유지) |
| 매칭 | 단순 매칭 | **FIFO 큐 + Vault counterparty** |
| 프론트엔드 | 별도 앱 | **통합 앱 /options** |
