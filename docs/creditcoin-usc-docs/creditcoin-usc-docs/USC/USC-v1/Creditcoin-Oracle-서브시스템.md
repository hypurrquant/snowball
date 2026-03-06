# Creditcoin Oracle 서브시스템

Creditcoin Oracle은 여러 서브시스템으로 구성되어 있으며, 각 서브시스템은 외부 체인의 상태를 검증하고 증명하는 데 중요한 역할을 합니다.

## 서브시스템 목록

### [[USC/USC-v1/Creditcoin-Oracle-서브시스템/증명|Attestation]]

Creditcoin Oracle의 증명(attestation) 서브시스템은 외부 체인의 확인된 상태에 대한 합의를 달성합니다. 그런 다음 해당 합의를 Creditcoin에 기록합니다.

### [[USC/USC-v1/Creditcoin-Oracle-서브시스템/증명/증명과-연속성-증명|Attestation and Continuity Proving]]

연속성 증명(Continuity proving)은 증명(attestation)을 사용하여 블록이 소스 체인의 일부임을 인증하는 프로세스입니다.

### [[USC/USC-v1/Creditcoin-Oracle-서브시스템/증명-시스템|Proving]]

Creditcoin Oracle의 증명자(prover) 서브시스템은 증명(attestation)과 소스 체인 블록을 사용하여 특정 소스 체인 트랜잭션의 일부가 주어진 소스 체인에 포함되어 있음을 증명합니다.

### [[USC/USC-v1/Creditcoin-Oracle-서브시스템/증명-시스템/오라클-인터페이스로서의-증명자-컨트랙트|Prover Contracts as Oracle Interfaces]]

증명자 컨트랙트가 오라클 쿼리 제출을 중재하고 결과를 저장하는 방식을 설명합니다.

### [[USC/USC-v1/Creditcoin-Oracle-서브시스템/증명-시스템/머클-증명-트랜잭션-포함|Merkle Proving Transaction Inclusion]]

트랜잭션 검증을 위한 머클 증명 방법론을 상세히 설명합니다.

### [[USC/USC-v1/Creditcoin-Oracle-서브시스템/증명-시스템/STARK-증명|STARK Proving]]

단일 증명자가 Creditcoin Oracle 작업을 충실히 수행했음을 인증할 수 있는 프로세스입니다.
