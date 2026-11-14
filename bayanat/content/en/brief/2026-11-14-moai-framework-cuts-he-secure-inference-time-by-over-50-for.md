---
title: MOAI framework cuts HE secure inference time by over 50% for BERT-base
date: '2026-11-14'
pillar: security
status: draft
relevance: 85
source_name: arXiv · Cryptography and Security
source_url: https://arxiv.org/abs/2611.13641
source_kind: research
named_incident: false
needs_primary_source: false
summary: Researchers introduced MOAI, a homomorphic encryption framework for non-interactive secure transformer inference. By optimizing matrix multiplications and eliminating specific rotations, MOAI reduces evaluation time by 52.8% compared to the THOR baseline for BERT-base. The system also achieves a 55.7% time reduction when applied to the Powerformer framework, addressing computational overhead in cloud-based LLM deployment.
why_it_matters: This may lower the computational cost of running privacy-preserving AI models in the cloud, potentially making secure inference more viable for data teams.
my_take: ''
facts_to_check:
- 52.8% reduction in evaluation time compared to THOR
- 55.7% reduction in evaluation time compared to Powerformer
- 2,448 HE rotations removed in BERT-base inference
- 1.7x fewer HE rotations compared to state-of-the-art works
- THOR cited as Moon et al., CCS 25
drafted_with: groq/qwen/qwen3.8-27b
---


