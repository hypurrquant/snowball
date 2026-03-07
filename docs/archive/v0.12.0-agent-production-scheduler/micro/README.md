# 작업 티켓 - v0.12.0

## 전체 현황

| # | Step | 난이도 | 롤백 | Scope | FP/FN | 개발 | 완료일 |
|---|------|--------|------|-------|-------|------|--------|
| 01 | AgentVault V2 컨트랙트 수정 | 🟠 | ✅ | ✅ | ✅ | ⏳ | - |
| 02 | 컨트랙트 배포 + 주소 전환 | 🟡 | ✅ | ✅ | ✅ | ⏳ | - |
| 03 | ABI 업데이트 | 🟢 | ✅ | ✅ | ✅ | ⏳ | - |
| 04 | Config 타입 업데이트 (troveNFT) | 🟢 | ✅ | ✅ | ✅ | ⏳ | - |
| 05 | vault.ts expiry 체크 정렬 | 🟢 | ✅ | ✅ | ✅ | ⏳ | - |
| 06 | 스케줄러 멀티유저 루프 | 🔴 | ✅ | ✅ | ✅ | ⏳ | - |

## 의존성

```
01 → 02 → 03 → 04 → 06
                05 → 06 (05는 독립, 06 전에 완료)
```

- Step 01~04: 순차 (컨트랙트 → 배포 → ABI → config)
- Step 05: 독립 (언제든 가능, 06 전에 완료)
- Step 06: 02+03+04+05 모두 완료 후

## 커버리지 매트릭스

### PRD 목표 → 티켓

| PRD 목표 | 관련 티켓 | 커버 |
|----------|----------|------|
| 1. getDelegatedUsers 온체인 조회 | Step 01, 03 | ✅ |
| 2. 스케줄러 멀티유저 루프 | Step 06 | ✅ |
| 3. 유저별 troveId 자동 탐색 | Step 03, 04, 06 | ✅ |
| 4. 컨트랙트 재배포 + 주소 전환 | Step 02 | ✅ |

### DoD → 티켓

| DoD 항목 | 관련 티켓 | 커버 |
|----------|----------|------|
| F1: getDelegatedUsers active 필터링 | Step 01 | ✅ |
| F2: grantPermission 중복 방지 | Step 01 | ✅ |
| F3: 주소 3곳 반영 | Step 02 | ✅ |
| F4: getDelegatedUsers(agentEOA) 호출 | Step 06 | ✅ |
| F5: 유저별 runAgent 순차 호출 | Step 06 | ✅ |
| F6: buildTroveMap tick당 1회 | Step 06 | ✅ |
| F7: AGENT_CRON_USER 제거 | Step 06 | ✅ |
| F8: vault.ts expiry >= now | Step 05 | ✅ |
| F9: core agent.ts ABI 추가 | Step 03 | ✅ |
| F10: runtime abis.ts ABI 추가 | Step 03 | ✅ |
| F11: config troveNFT 추가 | Step 04 | ✅ |
| N1: tsc --noEmit 통과 | Step 03, 04, 05, 06 | ✅ |
| N2: agent-server 빌드 | Step 06 (npm run build) | ✅ |
| N3: agent-runtime 빌드 | Step 05 (npm run build — 최종 수정 티켓) | ✅ |
| N4: forge build | Step 01 | ✅ |
| E1~E9: 엣지케이스 | Step 01 (E5,E6,E7), Step 06 (E1,E2,E3,E4,E8,E9) | ✅ |

### 설계 결정 → 티켓

| 설계 결정 | 관련 티켓 | 커버 |
|----------|----------|------|
| TD-1: revoke 시 배열 미삭제, view 필터링 | Step 01 | ✅ |
| TD-2: tick당 1회 global scan | Step 06 | ✅ |
| TD-3: config에 troveNFT 추가 | Step 04 | ✅ |
| TD-4: abis.ts에 ABI 추가 | Step 03 | ✅ |
| TD-5: AGENT_CRON_USER 제거 | Step 06 | ✅ |
| TD-6: 단일 branch(wCTC) 스캔 | Step 06 | ✅ |
| TD-7: vault.ts expiry >= now | Step 05 | ✅ |
| TD-8: loadConfig() 직접 호출 | Step 06 | ✅ |

## Step 상세
- [Step 01: AgentVault V2 컨트랙트 수정](step-01-contract.md)
- [Step 02: 컨트랙트 배포 + 주소 전환](step-02-deploy.md)
- [Step 03: ABI 업데이트](step-03-abi.md)
- [Step 04: Config 타입 업데이트](step-04-config.md)
- [Step 05: vault.ts expiry 체크 정렬](step-05-vault-expiry.md)
- [Step 06: 스케줄러 멀티유저 루프](step-06-scheduler.md)
