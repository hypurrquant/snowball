# Snowball iOS App — Deep Interview Spec

---

## Metadata

| 항목 | 값 |
|------|-----|
| Interview ID | di-snowball-ios-001 |
| 생성일 | 2026-03-17 |
| 라운드 수 | 15 |
| 최종 모호도 | 18% |
| 타입 | Greenfield |
| 임계값 | 20% |
| 상태 | PASSED |
| 대상 플랫폼 | iOS |
| 버전 | v0.1 (MVP) |

---

## Clarity Breakdown

| 차원 | 점수 | 상태 |
|------|------|------|
| Goal (목표) | 0.92 | 명확 |
| Constraints (제약) | 0.75 | 충분 |
| Success Criteria (성공 기준) | 0.75 | 충분 |
| 종합 모호도 | 18% | PASSED (임계값 20% 이하) |

---

## Goal (목표)

Snowball Protocol의 전체 DeFi 기능을 iOS에서 **AI 에이전트 대화**로 조작할 수 있는 앱을 개발한다.

### 핵심 개념

- **AI 에이전트가 핵심**이다. CLI는 에이전트가 프로토콜을 실행하기 위한 도구이다.
- 사용자는 자연어 채팅 또는 터미널 명령어로 에이전트와 상호작용한다.
- 에이전트는 Skills(가이드)를 참조하여 snowball-cli를 통해 온체인 TX를 직접 실행한다.
- 백엔드 없이 iOS 기기에서 Creditcoin Testnet RPC와 직접 통신한다.

### 사용자 여정 (핵심 플로우)

```
사용자 입력 (채팅 or CLI)
    ↓
Local LLM Agent (온디바이스)
    ↓ (fallback 시)
Cloud LLM API (Claude / GPT 등)
    ↓
Skills 참조 → CLI 명령어 생성
    ↓
snowball-cli 실행 → TX 준비
    ↓
Wallet Signing (자동 or 수동)
    ↓
Blockchain RPC (Creditcoin Testnet)
    ↓
결과 → 에이전트 응답으로 표시
```

---

## Constraints (제약사항)

### 기술 제약

| 제약 | 내용 |
|------|------|
| 플랫폼 | iOS 전용 |
| 체인 | Creditcoin Testnet (chainId: 102031) |
| 백엔드 | 없음 — 온체인 직접 통신 |
| LLM | 하이브리드 (로컬 온디바이스 + 클라우드 fallback) |
| 월렛 | WalletConnect (외부 월렛 연동) |
| 키 관리 | 프라이빗 키 앱 내 저장 금지 — WalletConnect 전담 |
| 서명 | 금액 기준 자동/수동 (임계값 설정 가능) |
| 인증 | Face ID / Touch ID (iOS Keychain 연동) |

### 프로토콜 제약

MVP에서 지원해야 하는 프로토콜 (최소 2개 이상, 전체 목표):

| 프로토콜 | 카테고리 | 우선순위 |
|----------|----------|----------|
| DEX (Uniswap V3) | Swap | P1 |
| Liquity | Borrow/Earn | P1 |
| Morpho | Lend | P2 |
| Yield Vaults | 자동 복리 | P2 |
| ERC-8004 | AI Agent 온체인 | P3 |

> Options 모듈은 MVP 제외 (웹앱 CLAUDE.md 정책 동일 적용)

---

## Non-Goals (제외 범위)

- NestJS 백엔드 공유 또는 연동
- Android 지원
- 웹앱(Next.js) 코드 재사용
- Options 바이너리 옵션 모듈
- 자체 월렛 생성 / 프라이빗 키 관리
- 완전 오프라인 모드 (RPC 연결 필수)
- Push notification 시스템 (MVP 이후)
- 포트폴리오 트래킹 대시보드 (MVP 이후)

---

## Acceptance Criteria (성공 기준)

### MVP 최소 성공 조건

- [ ] **AC-001**: 에이전트와 자연어 대화 후 **최소 2개 프로토콜에서 각 1건 이상** 온체인 TX 성공
- [ ] **AC-002**: TX 서명 시 설정된 임계값 기준으로 자동/수동 분기 동작
- [ ] **AC-003**: 로컬 LLM 실패 시 클라우드 LLM으로 자동 fallback
- [ ] **AC-004**: WalletConnect로 외부 월렛(MetaMask Mobile 등) 연결 후 서명 완료
- [ ] **AC-005**: 터미널 모드에서 CLI 명령어 직접 입력 후 실행 가능

### 품질 기준

- [ ] **AC-006**: 에이전트 응답 지연 < 3초 (로컬 LLM 기준, 첫 토큰)
- [ ] **AC-007**: TX 실패 시 에이전트가 실패 원인을 자연어로 설명
- [ ] **AC-008**: Face ID 인증 후 WalletConnect 세션 자동 복구
- [ ] **AC-009**: 두 UI 모드(터미널/채팅) 간 전환 가능

---

## Assumptions Exposed & Resolved

| 가정 | 노출 라운드 | 해결 방법 |
|------|------------|----------|
| LLM이 반드시 로컬이어야 한다 | R5 (Contrarian) | 하이브리드로 변경 — 로컬 우선, 클라우드 fallback |
| 단일 프로토콜로 MVP 충분하다 | R14 | 멀티 프로토콜 필수 (최소 2개) |
| CLI가 핵심이다 | R9 (Ontologist) | AI 에이전트가 핵심, CLI는 도구 |
| 기존 백엔드를 공유한다 | R11 | 완전 독립 — 온체인 직접 통신 |
| iOS 개발 프레임워크 미결정 | R6 | 아래 Framework Recommendation 참조 |
| 로컬 LLM 모델 미결정 | R4 | 아래 Framework Recommendation 참조 |
| 파워 유저만 타겟 | R15 | 양쪽 모두 — CLI(파워 유저) + 채팅(일반 유저) |

---

## Framework Recommendation

### iOS 개발 프레임워크: Swift (Native)

**권장: Swift + SwiftUI (Native iOS)**

React Native, Flutter 등의 크로스플랫폼 프레임워크 대신 **네이티브 Swift를 권장**하는 이유:

| 요구사항 | Native Swift | React Native | Flutter |
|----------|-------------|--------------|---------|
| 온디바이스 LLM (Core ML / MLX) | 완전 지원 | 제한적 브릿지 필요 | 제한적 |
| iOS Keychain / Face ID | 완전 지원 | 플러그인 의존 | 플러그인 의존 |
| WalletConnect iOS SDK | 공식 Swift SDK 존재 | JS 래퍼 필요 | 비공식 |
| 터미널 UI (커스텀 렌더링) | SwiftUI 완전 제어 | 제약 있음 | 가능 |
| 성능 (LLM + RPC 병렬) | 최상 | 브릿지 오버헤드 | 양호 |
| App Store 심사 | 기본 | 추가 검토 가능성 | 추가 검토 가능성 |

**핵심 라이브러리 스택:**

```
UI Layer
├── SwiftUI — 채팅 UI, 터미널 에뮬레이터
└── UIKit (필요 시) — 고성능 터미널 렌더링

AI/LLM Layer
├── MLX Swift — Apple Silicon 온디바이스 LLM 추론 (추천)
│   └── 모델 후보: Phi-3-mini (3.8B), Gemma-2B, Llama-3.2-1B
├── Core ML — 모델 변환 및 로딩
└── URLSession — 클라우드 LLM API (Claude API / OpenAI API)

Blockchain Layer
├── web3.swift — 이더리움 호환 RPC 클라이언트
│   └── Creditcoin Testnet 직접 통신
├── WalletConnectSwift v2 — 외부 월렛 연동
└── BigInt — 온체인 숫자 처리

Security Layer
├── Security framework — iOS Keychain
└── LocalAuthentication — Face ID / Touch ID

Networking
└── URLSession / AsyncHTTPClient — RPC + API 통신
```

### 온디바이스 LLM 모델 권장

| 모델 | 파라미터 | 메모리 | 특징 | 권장 기기 |
|------|----------|--------|------|----------|
| Llama-3.2-1B | 1B | ~800MB | 가장 빠름, 기본 추론 | iPhone 13+ |
| Phi-3-mini (INT4) | 3.8B | ~2GB | 코드 생성 강점, CLI 명령어 생성 적합 | iPhone 15+ |
| Gemma-2B | 2B | ~1.5GB | 범용, 균형 | iPhone 14+ |

> **권장**: Phi-3-mini INT4 — CLI 명령어 생성과 DeFi 프로토콜 추론에 특화. iPhone 15 Pro 이상에서 최적 성능.

### Architecture Pattern

```
snowball-ios/
├── App/
│   ├── SnowballApp.swift
│   └── AppState.swift
├── Features/
│   ├── Chat/               # 일반 유저 채팅 UI
│   ├── Terminal/           # 파워 유저 CLI UI
│   ├── Agent/              # LLM Agent 코어
│   └── Settings/           # 월렛, LLM, TX 임계값 설정
├── Core/
│   ├── Skills/             # 프로토콜별 에이전트 가이드
│   ├── CLI/                # snowball-cli Swift 구현
│   ├── Protocols/          # DEX, Liquity, Morpho, Vault, ERC-8004
│   └── Wallet/             # WalletConnect + Signing
├── Infrastructure/
│   ├── LLM/
│   │   ├── LocalLLMService.swift    # MLX 온디바이스
│   │   └── CloudLLMService.swift    # Claude/GPT API
│   ├── RPC/                # Creditcoin Testnet RPC
│   └── Keychain/           # 보안 스토리지
└── Resources/
    ├── Models/             # .gguf / Core ML 모델 파일
    └── Skills/             # 프로토콜 Skills JSON/Markdown
```

---

## Technical Context

### 기존 웹앱과의 관계

| 항목 | 웹앱 | iOS 앱 |
|------|------|--------|
| 프레임워크 | Next.js + wagmi + viem | Swift + SwiftUI |
| 백엔드 | NestJS (apps/server) | 없음 (독립) |
| 월렛 | Privy | WalletConnect v2 |
| 체인 통신 | viem | web3.swift |
| 코드 공유 | — | ABI JSON만 참조 가능 |

### 온체인 설정 (기존 웹앱과 동일)

```swift
// Creditcoin Testnet
let chainId: Int = 102031
let rpcURL = "https://rpc.cc3-testnet.creditcoin.network"

// Oracle Scale (Morpho Blue 표준)
let ORACLE_SCALE: BigUInt = BigUInt(10).power(36)

// 현재 테스트넷 가격 참고
// wCTC = $5 (5e36), lstCTC = $5.20 (5.2e36), sbUSD = $1 (1e36)
```

### WalletConnect 자동/수동 서명 임계값

```swift
struct SigningPolicy {
    var autoSignThreshold: BigUInt  // 이 금액 이하 자동 서명 (USD 기준)
    var requireBiometric: Bool      // Face ID 필수 여부
    var allowedProtocols: Set<Protocol>  // 자동 서명 허용 프로토콜
}
```

### Skills 구조

Skills는 에이전트가 각 프로토콜의 CLI 명령어를 올바르게 생성하도록 돕는 가이드 문서이다.

```markdown
# Skill: DEX Swap

## 목적
Uniswap V3 기반 토큰 스왑을 실행한다.

## CLI 명령어
snowball dex swap --from <token> --to <token> --amount <amount> --slippage <bps>

## 파라미터
- from: 입력 토큰 주소 또는 심볼
- to: 출력 토큰 주소 또는 심볼
- amount: 입력 금액 (소수점 포함)
- slippage: 슬리피지 허용치 (basis points, 기본값: 50)

## 예시
snowball dex swap --from wCTC --to sbUSD --amount 10 --slippage 50

## 주의사항
- 최대 보유량의 5% 이하 권장
- 유동성 부족 시 에러 발생 가능
```

---

## Ontology

| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| Snowball-CLI | core | 터미널+채팅 하이브리드 UI, 프로토콜 명령어 파서 | Agent가 사용, Protocols에 연결 |
| Skills | supporting | 가이드 문서(Markdown/JSON), 프로토콜별 CLI 사용법, 예시 | Agent에게 CLI 사용법 제공 |
| Local LLM Agent | core | 온디바이스 AI (MLX), 스킬 읽기, CLI 명령어 생성, 대화 컨텍스트 관리 | Skills 참조, CLI 호출, TX 준비 |
| Cloud LLM API | supporting | 클라우드 fallback (Claude API / OpenAI API), 스트리밍 응답 | Local LLM 대체/보완 |
| Snowball Protocols | external | DEX(Uniswap V3), Liquity, Morpho, Vault, ERC-8004 | CLI를 통해 접근, ABI로 인코딩 |
| Transaction (TX) | core | 온체인 트랜잭션 객체, 프로토콜별 calldata, 가스 추정 | Agent가 준비, Wallet이 서명 |
| Wallet Signing | core | 금액 임계값 기준 자동/수동 분기, Face ID 트리거 | TX 서명 처리, WalletConnect 위임 |
| WalletConnect | supporting | WalletConnect v2 iOS SDK, 세션 관리, 서명 요청 | Wallet Signing 구현 방식 |
| Blockchain RPC | external | Creditcoin Testnet (chainId: 102031), web3.swift 클라이언트 | 직접 온체인 통신, TX 브로드캐스트 |
| User Segments | supporting | 파워 유저 (CLI 모드), 일반 유저 (채팅 모드) | UI 모드 결정, 기능 노출 레벨 |

---

## Ontology Convergence

인터뷰 15라운드 동안 온톨로지가 어떻게 수렴했는지:

```
R1:  "snowball-cli + 에이전트" → CLI와 에이전트가 동등한 것으로 오해
R3:  Skills = 모듈형 기능? → 아니오, 에이전트의 CLI 가이드 문서
R9:  [ONTOLOGIST] "CLI가 핵심인가, AI가 핵심인가?" → AI 에이전트가 핵심으로 명확화
R11: 백엔드 공유 가정 → 완전 독립으로 해결
R14: 단일 프로토콜 MVP → 멀티 프로토콜 필수로 강화

최종 핵심 온톨로지:
[사용자] → [채팅/CLI UI] → [AI 에이전트 (LLM)] → [Skills] → [CLI] → [Protocols] → [TX] → [Wallet] → [Chain]
```

**핵심 통찰**: 이 앱의 본질은 "DeFi 조작 인터페이스"가 아니라 "DeFi를 이해하고 실행하는 AI 에이전트"이다. UI는 에이전트와의 소통 채널일 뿐이다.

---

## Implementation Roadmap (권장)

### Phase 1 — Foundation (MVP)
- [ ] Swift + SwiftUI 프로젝트 셋업
- [ ] WalletConnect v2 연동 + 세션 관리
- [ ] web3.swift + Creditcoin Testnet RPC 연결
- [ ] 채팅 UI 기본 구현
- [ ] 터미널 UI 기본 구현 (UI 전환 포함)
- [ ] Local LLM 통합 (MLX Swift + Phi-3-mini)
- [ ] Cloud LLM fallback (Claude API)
- [ ] Skills 시스템 (DEX + Liquity 우선)
- [ ] snowball-cli 코어 명령어 파서
- [ ] TX 자동/수동 서명 정책

### Phase 2 — Protocol Coverage
- [ ] Morpho 마켓 Skills + CLI
- [ ] Yield Vault Skills + CLI
- [ ] ERC-8004 에이전트 온체인 연동

### Phase 3 — Polish
- [ ] 에이전트 응답 스트리밍
- [ ] TX 히스토리 뷰
- [ ] 포트폴리오 잔고 표시
- [ ] 멀티 월렛 지원

---

## Open Questions (잔여 모호성 18%)

다음 항목들은 구현 시 추가 결정이 필요하다:

| 질문 | 우선순위 | 결정 방법 |
|------|----------|----------|
| 로컬 LLM 모델 파일 배포 전략 (App Store 크기 제한 4GB) | P1 | On-demand download vs. bundled |
| 클라우드 LLM API 키 관리 (사용자 제공 vs. 서버 프록시) | P1 | 구현 전 결정 필요 |
| TX 자동 서명 기본 임계값 (달러 기준) | P2 | UX 리서치 후 결정 |
| Skills 업데이트 메커니즘 (앱 내 vs. 원격 fetch) | P2 | 프로토콜 변경 빈도에 따라 |
| 에이전트 대화 히스토리 영속성 (로컬 DB vs. 세션 한정) | P3 | 프라이버시 정책에 따라 |

---

## Interview Transcript

### Round 1 — Goal
**Q:** 이 iOS 앱의 핵심 목적은 무엇인가요? 기존 Snowball Protocol 웹앱의 기능을 모바일로 가져오려는 건가요?

**A:** snowball의 전체 프로토콜을 사용할 수 있는 snowball-cli와 스킬을 개발하고 로컬 LLM을 사용하는 에이전트가 탑재된 iOS 앱을 개발하는 게 목적

**Scores:** Goal=0.45, Constraints=0.05, Criteria=0.05, Ambiguity=79%

---

### Round 2 — Goal
**Q:** iOS 앱에서 'snowball-cli'라고 하셨는데, 사용자가 앱과 상호작용하는 형태는?

**A:** 터미널 + 채팅 하이브리드

**Scores:** Goal=0.55, Constraints=0.05, Criteria=0.05, Ambiguity=75%

---

### Round 3 — Goal
**Q:** '스킬'이라고 하셨는데, 이것은 에이전트가 호출할 수 있는 모듈형 기능 단위인가요?

**A:** 에이전트가 CLI를 사용하기 위한 가이드

**Scores:** Goal=0.65, Constraints=0.05, Criteria=0.05, Ambiguity=71%

---

### Round 4 — Constraints
**Q:** 로컬 LLM으로 어떤 모델을 상정하고 계신가요?

**A:** 아직 미정

**Scores:** Goal=0.65, Constraints=0.15, Criteria=0.05, Ambiguity=68%

---

### Round 5 — CONTRARIAN MODE
**Q:** LLM이 반드시 '로컬'이어야 하는 이유가 있나요?

**A:** 하이브리드로 변경 가능 (로컬 + 클라우드 fallback)

**Scores:** Goal=0.65, Constraints=0.30, Criteria=0.05, Ambiguity=64%

---

### Round 6 — Constraints
**Q:** iOS 앱 개발 프레임워크는?

**A:** 아직 미정

**Scores:** Goal=0.65, Constraints=0.35, Criteria=0.05, Ambiguity=62%

---

### Round 7 — SIMPLIFIER MODE — Success Criteria
**Q:** MVP의 가장 최소한 버전에서 성공하면 '되었다'고 느끼는 순간은?

**A:** 에이전트 대화 + TX 실행

**Scores:** Goal=0.70, Constraints=0.35, Criteria=0.40, Ambiguity=50%

---

### Round 8 — Goal
**Q:** 에이전트가 TX를 실행할 때 월렛 서명은 어떻게 처리?

**A:** 금액 기준 자동/수동

**Scores:** Goal=0.80, Constraints=0.35, Criteria=0.45, Ambiguity=44%

---

### Round 9 — ONTOLOGIST MODE
**Q:** 이 앱의 핵심은 'DeFi를 대화로 조작하는 AI 에이전트'인가요? 아니면 CLI 자체가 핵심?

**A:** AI 에이전트가 핵심

**Scores:** Goal=0.85, Constraints=0.35, Criteria=0.45, Ambiguity=42%

---

### Round 10 — Goal
**Q:** MVP에서 에이전트가 지원해야 할 프로토콜 범위는?

**A:** 전체 프로토콜 (DEX, Liquity, Morpho, Vault, ERC-8004)

**Scores:** Goal=0.90, Constraints=0.35, Criteria=0.50, Ambiguity=39%

---

### Round 11 — Constraints
**Q:** iOS 앱이 기존 NestJS 백엔드를 공유하나요?

**A:** 완전 독립 (온체인 직접 통신)

**Scores:** Goal=0.90, Constraints=0.50, Criteria=0.50, Ambiguity=34%

---

### Round 12 — Success Criteria
**Q:** MVP가 '성공'이라고 판단하려면 구체적으로 어떤 시나리오가 동작해야?

**A:** 단일 프로토콜 TX 성공

**Scores:** Goal=0.90, Constraints=0.50, Criteria=0.65, Ambiguity=30%

---

### Round 13 — Constraints
**Q:** 프라이빗 키 관리 방식은?

**A:** 외부 월렛 연동 (WalletConnect)

**Scores:** Goal=0.90, Constraints=0.65, Criteria=0.65, Ambiguity=25%

---

### Round 14 — Success Criteria
**Q:** 멀티 프로토콜 필수인가요?

**A:** 멀티 프로토콜 필수 (최소 2개 이상)

**Scores:** Goal=0.90, Constraints=0.65, Criteria=0.75, Ambiguity=22%

---

### Round 15 — Constraints
**Q:** 앱의 타겟 사용자는 누구?

**A:** 둘 다 (파워 유저 CLI + 일반 유저 채팅)

**Scores:** Goal=0.92, Constraints=0.75, Criteria=0.75, Ambiguity=18%

---

*Generated by oh-my-claudecode deep-interview skill. Interview ID: di-snowball-ios-001*
