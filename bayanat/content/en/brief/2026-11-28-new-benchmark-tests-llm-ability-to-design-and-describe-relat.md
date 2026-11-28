---
title: New benchmark tests LLM ability to design and describe relational database schemata
date: '2026-11-28'
pillar: llm
status: draft
relevance: 60
source_name: arXiv · Databases
source_url: https://arxiv.org/abs/2611.17044
source_kind: research
named_incident: false
needs_primary_source: false
summary: Researchers introduced SchemaBridge, a benchmark of 902 schemata to evaluate Large Language Models on designing schemas from text and verbalizing existing structures. The study assessed six open-weight and proprietary models, finding that human-written requirements often under-specify schemas. It also showed that prompting models for completeness significantly improved their ability to capture referential integrity, though this came at the cost of standard text similarity metrics.
why_it_matters: Data teams relying on LLMs for schema documentation or generation should note that current models struggle to preserve complex relational constraints unless explicitly prompted for structural completeness.
my_take: ''
facts_to_check:
- 902 schemata
- six open-weight and proprietary LLMs
- 0.27 referential integrity F1
- GPT-5.4-mini
- 0.228 to 0.909 referential F1
- SchemaBench
drafted_with: groq/qwen/qwen3.8-27b
---


