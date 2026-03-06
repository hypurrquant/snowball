# STARK 증명

> **참고:** 이 문서는 이전 버전의 문서입니다. 최신 USC 테스트넷 문서는 [[USC/소개|USC 문서]]를 참조하세요.

## 소개

STARK 증명은 단일 증명자가 "Creditcoin Oracle 작업을 충실히 수행했음을 인증"할 수 있게 해주는 **확장 가능한 투명 지식 논증(Scalable Transparent Argument of Knowledge)** 시스템을 사용합니다. 이를 통해 수신자가 발신자를 신뢰하거나 계산을 반복할 필요 없이 계산을 검증할 수 있습니다.

## 핵심 프로세스

### 증명 생성

오프체인 오라클 쿼리 증명은 소스 체인 데이터(현재 이더리움만 지원)를 모니터링하는 전문화된 STARK 증명자에 의해 생성됩니다.

### 증명 검증

STARK 검증자는 증명 자체만을 사용하여 증명과 그 기반 계산을 검증하며, 이를 통해 악의적인 제출을 방지합니다.

## Cairo 프로그래밍

구현은 CairoVM에서 컴파일되고 실행되는 도메인 특화 언어인 **Cairo**를 활용합니다. 이 시스템은 "프로그램 실행의 추적과 함께 수학적 증명을 생성"합니다. 현재 시스템은 Cairo Zero를 사용합니다.

Cairo에 대해 더 알아보려면 다음 외부 리소스를 참조하세요:
- [Cairo Book - Getting Started](https://www.starknet.io/cairo-book/ch01-00-getting-started.html)
- [Cairo Book - Introduction](https://www.starknet.io/cairo-book/ch200-introduction.html)
- [STARK Anatomy](https://aszepieniec.github.io/stark-anatomy/index)

## Creditcoin 애플리케이션

STARK 증명을 사용하는 두 가지 주요 검증 프로세스가 있습니다:

1. **연속성 증명(Continuity proofs)** - 쿼리 상태가 증명된 소스 체인 히스토리를 따르는지 검증
2. **머클 증명(Merkle proofs)** - 쿼리된 블록 내 트랜잭션 포함을 확인 (자세한 내용은 [[USC/Creditcoin-Oracle-서브시스템/쿼리-증명-및-검증/머클-증명-트랜잭션-포함|머클 증명 - 트랜잭션 포함]] 참조)

## 처리 파이프라인

### 전처리

쿼리 데이터 레이아웃, 증명 체인 세그먼트, 트랜잭션 트리, 머클 경로를 구성합니다.

### 입력

통합 Cairo 프로그램은 다음을 수신합니다:
- 쿼리 메타데이터
- 트랜잭션 트리 매개변수
- 경로
- 원시 트랜잭션 데이터
- 증명 체인 세그먼트
- 범위 초과 플래그

### 처리

프로그램은 다음을 수행합니다:
- 트랜잭션 데이터가 머클 경로와 일치하는지 검증
- 경로 일관성 확인
- 연속성 증명 확장
- 쿼리 오프셋 해시 계산

### 출력

- 쿼리 인덱스
- 증명 체크포인트 다이제스트
- 블록 수
- 쿼리 데이터의 Pedersen 해시

### 후처리

증명자 클라이언트는 다음을 수행합니다:
- 증명 체크포인트 검증
- 쿼리 인덱스 확인
- 로컬에서 계산된 해시와 반환된 값 비교
