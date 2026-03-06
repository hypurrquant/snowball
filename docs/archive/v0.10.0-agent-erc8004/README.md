# Agent (ERC-8004) 프론트엔드 구현 - v0.10.0

## 문제 정의

### 현상
- ERC-8004 Agent 시스템의 스마트 컨트랙트 4개가 Creditcoin 테스트넷에 배포 완료됨
  - IdentityRegistry (`0x993C...de9B`) — 에이전트 등록 (ERC-721 NFT)
  - ReputationRegistry (`0x3E5E...0726`) — 평판 추적 (리뷰/점수)
  - ValidationRegistry (`0x84b9...a023`) — 인증 관리 (검증자 심사)
  - AgentVault (`0xb944...bc40`) — 자금 위임 실행
- 프론트엔드 `/agent` 페이지는 플레이스홀더 UI만 존재 (정적 텍스트, 온체인 호출 0건)
- ABI가 `apps/web/src/core/abis/`에 없음 (`packages/shared/src/abis/erc8004.ts`에만 존재)
- 훅 0개, 컴포넌트 0개 — 컨트랙트와 프론트엔드가 완전히 단절

### 원인
- 다른 프로토콜(DEX, Liquity, Morpho, Yield) 구현이 우선되어 Agent는 P4로 미뤄짐
- Agent 시스템은 다른 DeFi 프로토콜 대비 독립적이라 후순위로 밀림

### 영향
- 배포된 컨트랙트 4개가 프론트엔드에서 접근 불가 — 사실상 사용할 수 없는 상태
- "온체인 AI 에이전트" 스토리를 데모에서 보여줄 수 없음
- 에이전트 등록, 평판 조회, 자금 위임 등 핵심 유저 플로우 전무

### 목표
- ERC-8004 Agent 시스템의 **전체 유저 플로우**를 프론트엔드에서 사용 가능하게 만든다
- 두 가지 축을 모두 구현:
  1. **에이전트 마켓플레이스** — 등록/탐색/프로필/리뷰
  2. **볼트 위임 실행** — 예치/출금/권한 부여/조회/취소

구체적 유저 플로우:

| # | 플로우 | 컨트랙트 | R/W |
|---|--------|---------|-----|
| 1 | 에이전트 등록 (NFT 민팅) | IdentityRegistry | W |
| 2 | 내 에이전트 목록 조회 | IdentityRegistry | R |
| 3 | 전체 에이전트 탐색 | IdentityRegistry | R |
| 4 | 에이전트 프로필 (상세+평판+인증) | 3개 Registry | R |
| 5 | 에이전트 활성화/비활성화 | IdentityRegistry | W |
| 6 | 리뷰 작성 | ReputationRegistry | W |
| 7 | 볼트 예치/출금 | AgentVault | W |
| 8 | 권한 부여 (화이트리스트 기반) | AgentVault | W |
| 9 | 권한 조회/취소 | AgentVault | R+W |

### 비목표 (Out of Scope)
- 에이전트 봇의 실제 자동 실행 로직 (백엔드/봇 서비스)
- `executeOnBehalf`, `approveFromVault`, `transferFromVault` 등 에이전트 전용 함수의 FE 호출 (봇이 호출하는 함수)
- ValidationRegistry의 관리자 기능 (`addValidator`, `removeValidator`) — 관리자 전용
- Options 모듈 관련 일체 (MVP 제외)
- 백엔드 API 개발
- 다른 프로토콜(Liquity, Morpho) 연동 개선

## 전제/가정

### 탐색 데이터 획득 방식
- 테스트넷 환경으로 등록된 에이전트 수가 소규모 (수십~수백 단위)
- `totalAgents()` + `getAgentInfo(id)` 순차 클라이언트 스캔으로 충분
- 이벤트 인덱싱이나 별도 백엔드 캐시는 불필요 (향후 메인넷 스케일에서 재검토)

### 권한 부여 대상 주소 (agentId ↔ address 연결)
- IdentityRegistry의 `endpoint` 필드가 에이전트 봇의 실행 EOA 주소를 저장
- AgentVault의 `grantPermission(agent, ...)` 호출 시 이 `endpoint` 주소를 `agent` 파라미터로 사용
- UI 흐름: 에이전트 프로필에서 "권한 부여" 클릭 → 해당 에이전트의 `endpoint`를 자동으로 `agent` 주소에 매핑

### MVP 리뷰 태그 및 점수 규칙
- 컨트랙트는 자유 문자열 `_tag` 를 받지만, MVP에서는 `"general"` 단일 태그만 지원
- 점수: 컨트랙트 `100~500` (1.00~5.00) → UI에서 1~5 별점으로 표현
- 코멘트: 자유 텍스트 (최대 길이 제한은 가스비로 자연 조절)

### Agent NFT Transfer
- MVP에서 에이전트 NFT 전송(transfer)은 발생하지 않는다고 가정
- `getOwnerAgents(address)` 를 내 에이전트 목록의 진실 원천으로 사용
- 향후 transfer 지원 시 `ownerOf` 보정 로직 추가 필요 (현재 비목표)

### MVP 지원 토큰 범위
- AgentVault deposit/withdraw 대상 토큰: wCTC, sbUSD, USDC, lstCTC (기존 `TOKENS` 설정 재사용)

## 제약사항
- 기존 DDD 4계층 아키텍처 (`core/` → `domains/` → `shared/` → `app/`) 준수
- 기존 UI 컴포넌트 시스템 (shadcn/ui 기반) 활용
- Creditcoin 테스트넷 (chainId: 102031) 대상
- 컨트랙트 소스코드 기반으로 ABI 정확성 보장 (abi-audit 교훈 반영)
