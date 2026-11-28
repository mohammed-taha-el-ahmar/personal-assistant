---
title: New metric RAS measures LLM safety via refusal alignment
date: '2026-11-28'
pillar: security
status: draft
relevance: 68
source_name: arXiv · Cryptography and Security
source_url: https://arxiv.org/abs/2606.25750
source_kind: research
named_incident: false
needs_primary_source: false
summary: Researchers introduced RAS, a representation-based indicator for evaluating harmful-request refusal in open-weight LLMs. Using the SafeVec procedure, it extracts refusal directions from a reference model to score related checkpoints. Tested on Llama, Gemma, and Qwen variants, RAS correlates strongly with behavioral attack success rates and offers significant speedups over traditional behavioral protocols for screening related models.
why_it_matters: This may allow data and AI teams to screen related model checkpoints for safety more efficiently than running full behavioral audits, potentially reducing evaluation costs.
my_take: ''
facts_to_check:
- Pearson correlation 0.934
- Spearman correlation 0.851
- 83.0% pairwise ordering agreement
- Mean cosine similarity 0.939
- Speedup of 3.2 to 80.5 times
- 18 held-out variants
- Llama, Gemma, and Qwen families
drafted_with: groq/qwen/qwen3.8-27b
---


