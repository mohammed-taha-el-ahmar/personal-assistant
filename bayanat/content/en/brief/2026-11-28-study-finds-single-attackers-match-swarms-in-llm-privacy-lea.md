---
title: Study finds single attackers match swarms in LLM privacy leaks
date: '2026-11-28'
pillar: security
status: draft
relevance: 85
source_name: arXiv · Cryptography and Security
source_url: https://arxiv.org/abs/2611.31791
source_kind: research
named_incident: false
needs_primary_source: false
summary: Researchers introduced SwarmLeak, a dataset of 24 synthetic group-chat scenarios to test if coordinated attackers extract more data from LLM agents than single attackers. Using GLM 5.2 against five victim models, they found swarms offer no advantage; single attackers matched or exceeded swarms. Victim model choice impacted leakage rates far more than attacker coordination, with some models leaking in nearly every run despite confidentiality policies.
why_it_matters: This suggests data teams should prioritize hardening individual agent models against prompt injection rather than focusing solely on detecting multi-agent collusion.
my_take: ''
facts_to_check:
- 24 synthetic group-chat scenarios
- GLM 5.2
- five victim models
- seven conversational strategies
- 200,000-token budget
- 14.3 percentage points
- 0% to 99.4%
- 85.4% vs. 68.1%
drafted_with: groq/qwen/qwen3.8-27b
---


