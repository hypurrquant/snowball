# DoD (Definition of Done) - v0.15.0

## 기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | Add Liquidity 클릭 시 타임라인 모달이 열리고, approve → mint 단계가 리스트로 표시됨 | 브라우저: 금액 입력 → Add Liquidity → 모달 열림 + step 리스트 확인 |
| F2 | 각 step이 pending(회색) → executing(스피너) → done(체크+초록) 순서로 상태 전환됨 | 브라우저: MetaMask confirm 전후 아이콘 변화 확인 |
| F3 | done 상태의 step에 tx 해시 링크(`EXPLORER_URL/tx/0x...`)가 표시되고 클릭 시 새 탭에서 열림 | 브라우저: 완료된 step의 "View transaction" 링크 클릭 → Blockscout 페이지 확인 |
| F4 | 모든 step 완료 시 성공 메시지 + "Close" 버튼 표시, 닫으면 input 초기화 | 브라우저: mint 완료 → "Transaction Complete" 표시 → Close → input "0" 확인 |
| F5 | 에러 발생 시 해당 step이 error(빨간 X) 상태로 표시되고 에러 메시지가 보임 | 브라우저: MetaMask에서 reject → 해당 step 빨간색 + 에러 메시지 확인 |
| F6 | approve가 불필요한 토큰은 step이 생략됨 (이미 approve된 경우) | 브라우저: 충분한 allowance 상태에서 Add Liquidity → approve step 없이 mint만 표시 |
| F7 | 실행 중(executing) 모달 backdrop 클릭/ESC로 닫히지 않음 | 브라우저: 실행 중 배경 클릭 + ESC → 모달 유지 확인 |

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | TypeScript strict 모드 에러 0 | `npx tsc --noEmit` |
| N2 | 빌드 성공 | `cd apps/web && npm run build` |
| N3 | 린트 통과 | `cd apps/web && npm run lint` |
| N4 | TxStepItem, TxPipelineModal은 `shared/components/ui/`에 위치 | `ls apps/web/src/shared/components/ui/tx-pipeline-modal.tsx apps/web/src/shared/components/ui/tx-step-item.tsx` |
| N5 | TxStep 타입은 `shared/types/tx.ts`에 위치 | `ls apps/web/src/shared/types/tx.ts` |
| N6 | 기존 TxState 타입 export가 제거되고, 새 TxStep/TxPhase로 대체 | `grep "TxState" apps/web/src/domains/trade/hooks/useCreatePosition.ts` 결과 0건 |

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | 양쪽 토큰 모두 approve 불필요 | step 리스트에 mint만 표시 (1개 step) | 브라우저: allowance 충분 상태에서 실행 → 1 step 확인 |
| E2 | approve 중 사용자가 MetaMask에서 reject | 해당 approve step이 error 상태, 에러 메시지 표시, 모달에 Close 버튼 | 브라우저: reject → 빨간 X + 메시지 + Close 버튼 확인 |
| E3 | mint 중 에러 (가스 부족 등) | mint step이 error 상태, 이전 approve step은 done 유지 | 브라우저: approve 성공 후 mint 실패 → approve done, mint error 확인 |
| E4 | 한쪽 토큰 amount가 0 (out-of-range) | 해당 토큰의 approve step이 생략됨 | 브라우저: out-of-range에서 한쪽만 입력 → approve 1개 + mint 확인 |

## PRD 목표 커버리지

| PRD 목표 | DoD 항목 | 커버 |
|----------|---------|------|
| 파이프라인 모달 | F1, F7 | ✅ |
| 단계별 상태 시각화 | F2, F6 | ✅ |
| 완료/에러 피드백 | F3, F4, F5 | ✅ |

## 설계 결정 커버리지

| 설계 결정 | DoD 항목 | 커버 |
|----------|---------|------|
| Radix Dialog 사용 | F1, F7 | ✅ |
| TxStep 타입 | N5, N6 | ✅ |
| shared/components/ui 배치 | N4 | ✅ |
| lucide-react 아이콘 | F2 | ✅ |
| Explorer 링크 | F3 | ✅ |
| 실행 중 닫기 방지 | F7 | ✅ |
