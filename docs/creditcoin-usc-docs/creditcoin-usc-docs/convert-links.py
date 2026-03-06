#!/usr/bin/env python3
"""
Phase 3: 마커 → Obsidian 링크 변환 스크립트
{{LINK:url|텍스트}} → [[경로|텍스트]]
"""

import os
import re
from pathlib import Path

# 매핑 테이블
URL_TO_PATH = {
    '/usc': 'USC/소개',
    '/usc/quickstart': 'USC/빠른-시작',
    '/usc/migration-guide': 'USC/마이그레이션-가이드',
    '/usc/overview/usc-architecture-overview': 'USC/개요/USC-아키텍처-개요',
    '/usc/creditcoin-oracle-subsystems/attestation': 'USC/Creditcoin-Oracle-서브시스템/증명',
    '/usc/creditcoin-oracle-subsystems/attestation/continuity-proving-for-attestation': 'USC/Creditcoin-Oracle-서브시스템/증명/증명을-위한-연속성-증명',
    '/usc/creditcoin-oracle-subsystems/query-proof-and-verification': 'USC/Creditcoin-Oracle-서브시스템/쿼리-증명-및-검증',
    '/usc/creditcoin-oracle-subsystems/query-proof-and-verification/process-flow': 'USC/Creditcoin-Oracle-서브시스템/쿼리-증명-및-검증/프로세스-흐름',
    '/usc/creditcoin-oracle-subsystems/query-proof-and-verification/continuity-proving-for-query': 'USC/Creditcoin-Oracle-서브시스템/쿼리-증명-및-검증/쿼리를-위한-연속성-증명',
    '/usc/creditcoin-oracle-subsystems/query-proof-and-verification/merkle-proving-transaction-inclusion': 'USC/Creditcoin-Oracle-서브시스템/쿼리-증명-및-검증/머클-증명-트랜잭션-포함',
    '/usc/creditcoin-oracle-subsystems/query-proof-and-verification/requesting-queries-and-proofs': 'USC/Creditcoin-Oracle-서브시스템/쿼리-증명-및-검증/쿼리-및-증명-요청',
    '/usc/dapp-builder-infrastructure': 'USC/DApp-빌더-인프라/인프라-개요',
    '/usc/dapp-builder-infrastructure/infrastructure-overview': 'USC/DApp-빌더-인프라/인프라-개요',
    '/usc/dapp-builder-infrastructure/source-chain-smart-contracts': 'USC/DApp-빌더-인프라/소스-체인-스마트-컨트랙트',
    '/usc/dapp-builder-infrastructure/universal-smart-contracts': 'USC/DApp-빌더-인프라/유니버설-스마트-컨트랙트',
    '/usc/dapp-builder-infrastructure/dapp-design-patterns': 'USC/DApp-빌더-인프라/DApp-디자인-패턴',
    '/usc/dapp-builder-infrastructure/offchain-oracle-workers': 'USC/DApp-빌더-인프라/오프체인-오라클-워커',
    '/usc/dapp-builder-infrastructure/usc-tutorials': 'USC/DApp-빌더-인프라/USC-튜토리얼',
    '/usc/infrastructure-overview': 'USC/DApp-빌더-인프라/인프라-개요',
    # USC v1
    '/usc/usc-v1/overview': 'USC/USC-v1/개요',
    '/usc/usc-v1/overview/usc-product-overview': 'USC/USC-v1/개요/USC-제품-개요',
    '/usc/usc-v1/overview/usc-architecture-overview': 'USC/USC-v1/개요/USC-아키텍처-개요',
    '/usc/usc-v1/creditcoin-oracle-subsystems': 'USC/USC-v1/Creditcoin-Oracle-서브시스템',
    '/usc/usc-v1/creditcoin-oracle-subsystems/attestation': 'USC/USC-v1/Creditcoin-Oracle-서브시스템/증명',
    '/usc/usc-v1/creditcoin-oracle-subsystems/attestation/attestation-and-continuity-proving': 'USC/USC-v1/Creditcoin-Oracle-서브시스템/증명/증명과-연속성-증명',
    '/usc/usc-v1/creditcoin-oracle-subsystems/proving': 'USC/USC-v1/Creditcoin-Oracle-서브시스템/증명-시스템',
    '/usc/usc-v1/creditcoin-oracle-subsystems/proving/prover-contracts-as-oracle-interfaces': 'USC/USC-v1/Creditcoin-Oracle-서브시스템/증명-시스템/오라클-인터페이스로서의-증명자-컨트랙트',
    '/usc/usc-v1/creditcoin-oracle-subsystems/proving/merkle-proving-transaction-inclusion': 'USC/USC-v1/Creditcoin-Oracle-서브시스템/증명-시스템/머클-증명-트랜잭션-포함',
    '/usc/usc-v1/creditcoin-oracle-subsystems/proving/stark-proving': 'USC/USC-v1/Creditcoin-Oracle-서브시스템/증명-시스템/STARK-증명',
    '/usc/usc-v1/dapp-builder-infrastructure': 'USC/USC-v1/DApp-빌더-인프라',
    '/usc/usc-v1/dapp-builder-infrastructure/infrastructure-overview': 'USC/USC-v1/DApp-빌더-인프라/인프라-개요',
    '/usc/usc-v1/dapp-builder-infrastructure/source-chain-smart-contracts': 'USC/USC-v1/DApp-빌더-인프라/소스-체인-스마트-컨트랙트',
    '/usc/usc-v1/dapp-builder-infrastructure/universal-smart-contracts': 'USC/USC-v1/DApp-빌더-인프라/유니버설-스마트-컨트랙트',
    '/usc/usc-v1/dapp-builder-infrastructure/dapp-design-patterns': 'USC/USC-v1/DApp-빌더-인프라/DApp-디자인-패턴',
    '/usc/usc-v1/dapp-builder-infrastructure/offchain-oracle-workers': 'USC/USC-v1/DApp-빌더-인프라/오프체인-오라클-워커',
    '/usc/usc-v1/dapp-builder-infrastructure/usc-tutorials': 'USC/USC-v1/DApp-빌더-인프라/USC-튜토리얼',
    '/usc/usc-v1/quickstart': 'USC/USC-v1/빠른-시작',
    '/usc/usc-v1/infrastructure-overview': 'USC/USC-v1/DApp-빌더-인프라/인프라-개요',
}

def normalize_url(url):
    """URL 정규화: 전체 URL에서 경로만 추출, 앵커 제거"""
    # https://docs.creditcoin.org/usc/... 형식 처리
    if url.startswith('https://docs.creditcoin.org'):
        url = url.replace('https://docs.creditcoin.org', '')

    # 앵커(#...) 제거
    if '#' in url:
        url = url.split('#')[0]

    # 끝의 / 제거
    url = url.rstrip('/')

    return url

def convert_marker_to_obsidian(match):
    """마커를 Obsidian 링크로 변환"""
    url = match.group(1)
    text = match.group(2)

    normalized_url = normalize_url(url)

    if normalized_url in URL_TO_PATH:
        path = URL_TO_PATH[normalized_url]
        return f'[[{path}|{text}]]'
    else:
        # 매핑되지 않은 URL은 원본 마크다운 링크로 변환
        print(f"  [WARNING] Unmapped URL: {url}")
        return f'[{text}]({url})'

def process_file(filepath):
    """파일 내 마커 변환"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # {{LINK:url|text}} 패턴 매칭
    pattern = r'\{\{LINK:([^|]+)\|([^}]+)\}\}'

    matches = re.findall(pattern, content)
    if matches:
        print(f"Processing: {filepath}")
        print(f"  Found {len(matches)} markers")

    new_content = re.sub(pattern, convert_marker_to_obsidian, content)

    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  Updated: {filepath}")
        return True
    return False

def main():
    base_dir = Path("/Users/mousebook/Library/Mobile Documents/iCloud~md~obsidian/Documents/creditcoin-usc-docs/USC")

    updated_count = 0
    total_count = 0

    for md_file in base_dir.rglob("*.md"):
        total_count += 1
        if process_file(md_file):
            updated_count += 1

    print(f"\n=== Summary ===")
    print(f"Total files: {total_count}")
    print(f"Updated files: {updated_count}")

if __name__ == "__main__":
    main()
