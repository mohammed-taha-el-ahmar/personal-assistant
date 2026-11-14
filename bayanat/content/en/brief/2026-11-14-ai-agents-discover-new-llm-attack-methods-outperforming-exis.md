---
title: AI agents discover new LLM attack methods, outperforming existing defenses
date: '2026-11-14'
pillar: security
status: draft
relevance: 80
source_name: arXiv · Cryptography and Security
source_url: https://arxiv.org/abs/2603.24511
source_kind: research
named_incident: false
needs_primary_source: false
summary: Researchers used AI agents in an autoresearch loop to find novel adversarial attacks against large language models. The pipeline successfully jailbroke OpenAI's GPT-OSS-Safeguard-20B and executed prompt injections against Meta-SecAlign-70B. Agent-discovered methods achieved up to 80% attack success on CBRN queries for GPT-OSS-Safeguard and 100% for SecAlign, surpassing prior automated methods. The study suggests automating attack discovery should become the standard for evaluating model defenses.
why_it_matters: Data and AI teams should expect that automated, agent-driven attack discovery will become the baseline for security testing, requiring more rigorous evaluation of LLM defenses against tailored threats.
my_take: ''
facts_to_check:
- GPT-OSS-Safeguard-20B
- Meta-SecAlign-70B
- 80% attack success rate on CBRN queries
- <50% for existing methods
- 100% ASR for SecAlign
- 82% for best prior automated methods
- 30+ prior methods
drafted_with: groq/qwen/qwen3.8-27b
---


