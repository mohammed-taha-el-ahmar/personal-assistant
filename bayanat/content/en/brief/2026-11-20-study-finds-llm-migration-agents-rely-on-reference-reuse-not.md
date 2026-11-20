---
title: Study finds LLM migration agents rely on reference reuse, not true learning
date: '2026-11-20'
pillar: llm
status: draft
relevance: 65
source_name: arXiv · Databases
source_url: https://arxiv.org/abs/2611.16143
source_kind: research
named_incident: false
needs_primary_source: false
summary: A new arXiv paper evaluates an LLM agent for Oracle-to-PostgreSQL migration. Across four studies, persistent memory showed minimal gains, largely due to data leakage where 72% of test units shared references with training data. A simple copy baseline outperformed all LLM systems. Further testing revealed 10-22% of accepted code was behaviorally incorrect, and retrieval performance declined as the knowledge base grew.
why_it_matters: Data and AI teams should verify that automated migration tools are not merely copying references or producing behaviorally incorrect code, rather than genuinely learning from experience.
my_take: ''
facts_to_check:
- 1,833 documentation-derived source-reference pairs
- 0.015 improvement in reference conformity
- 264 of 367 held-out units (72%) shared references
- 0.002 memory effect on 103 leak-free units
- 0.222 RC score for nearest-target copy baseline
- 0.163 maximum RC score for LLM systems
- 374 units in 118 independent target groups
- 0.005 memory effect in rerun
drafted_with: groq/qwen/qwen3.8-27b
---


