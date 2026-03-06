# Step 01: 패키지 스캐폴딩

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: ✅ (디렉토리 삭제)
- **선행 조건**: 없음

---

## 1. 구현 내용 (design.md 기반)
- `apps/usc-worker/` 디렉토리 생성
- `package.json` 작성 (name, type: module, start script, dependencies: ethers, dotenv)
- `.env.example` 작성 (DEPLOYER_PRIVATE_KEY, SEPOLIA_RPC, USC_RPC, PROOF_API, START_BLOCK)
- `src/config.mjs` 작성 (환경변수 로드 + 상수: 컨트랙트 주소, ABI, 기본 블록 등)
- `src/index.mjs` 작성 (엔트리포인트 stub: config 로드 + "Worker started" 로그)

## 2. 완료 조건
- [ ] `apps/usc-worker/package.json` 존재하고 `"start": "node src/index.mjs"` 스크립트 포함
- [ ] `.env.example`에 5개 환경변수 명시
- [ ] `node src/index.mjs` 실행 시 "Worker started" 로그 출력 후 정상 종료
- [ ] `src/config.mjs`에서 DN_TOKEN_SEPOLIA, DN_BRIDGE_USC, CHAIN_INFO, VERIFIER 주소 export

## 3. 롤백 방법
- `rm -rf apps/usc-worker`

---

## Scope

### 신규 생성 파일
```
apps/usc-worker/
├── package.json
├── .env.example
└── src/
    ├── index.mjs
    └── config.mjs
```

### 수정 대상 파일
없음

### Side Effect 위험
없음 (신규 디렉토리만 추가)

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| package.json | 패키지 정의 | ✅ OK |
| .env.example | 환경변수 문서화 | ✅ OK |
| config.mjs | 설정 모듈 | ✅ OK |
| index.mjs | 엔트리포인트 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| 패키지 생성 | ✅ | OK |
| 환경변수 문서화 | ✅ | OK |
| 설정 모듈 | ✅ | OK |
| 엔트리포인트 | ✅ | OK |

### 검증 통과: ✅

---

→ 다음: [Step 02: 이벤트 폴러](step-02-poller.md)
