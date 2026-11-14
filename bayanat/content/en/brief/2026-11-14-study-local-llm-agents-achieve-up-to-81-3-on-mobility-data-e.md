---
title: 'Study: Local LLM agents achieve up to 81.3% on mobility data engineering tasks'
date: '2026-11-14'
pillar: llm
status: draft
relevance: 80
source_name: arXiv · Databases
source_url: https://arxiv.org/abs/2610.11482
source_kind: research
named_incident: false
needs_primary_source: false
summary: Researchers evaluated sixteen configurations from six local LLM families on fifteen mobility data-engineering tasks. Using a consumer-grade GPU, they ran 3,600 attempts across chat-only, chat-schema, and agent-with-tools conditions. Results show that models with 4 to 12 billion parameters achieved pass rates between 77.3% and 81.3%, while the best configuration reached 98.7%. The study highlights the impact of closed-loop workspaces on reliability.
why_it_matters: This suggests data teams may deploy smaller, local models for specific engineering workflows if equipped with appropriate tooling, potentially reducing reliance on external APIs.
my_take: ''
facts_to_check:
- 15 mobility data-engineering tasks
- 16 configurations from 6 model families
- 3,600 scored attempts
- 4-billion-parameter model at 4-bit reaches 77.3%
- 9-billion-parameter model reaches 80.0%
- 12-billion-parameter model reaches 81.3%
- Highest-scoring configuration reaches 98.7%
- Workspace loop raises pass rates by 24.0 to 65.3 points
drafted_with: groq/qwen/qwen3.8-27b
---


