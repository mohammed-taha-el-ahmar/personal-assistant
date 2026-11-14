---
title: Semantic Overlays reduce prompt injection success rates in LLMs
date: '2026-11-14'
pillar: security
status: draft
relevance: 80
source_name: arXiv · Cryptography and Security
source_url: https://arxiv.org/abs/2608.23873
source_kind: research
named_incident: false
needs_primary_source: false
summary: Researchers propose Semantic Overlays, trained adapters that mark untrusted text spans in language models to prevent prompt injection. By editing the model's residual stream, these overlays signal the model to treat marked content as inert. In testing, the method significantly lowered attack success rates on benchmarks like AlpacaFarm and AgentDojo compared to baseline models and other defenses.
why_it_matters: This approach may offer a more robust technical control for data and AI teams to mitigate prompt injection risks in agentic systems without retraining the entire model.
my_take: ''
facts_to_check:
- SEP separation rises from 24.3% to 98.8%
- AlpacaFarm attack success falls from 99.0% to 0.5%
- AgentDojo attack success falls from 12.8% to 0%
- TensorTrust hijack rate of 4.4% on Llama-3.1-8B
- Meta-SecAlign hijack rate of 43% on the same base
drafted_with: groq/qwen/qwen3.8-27b
---


