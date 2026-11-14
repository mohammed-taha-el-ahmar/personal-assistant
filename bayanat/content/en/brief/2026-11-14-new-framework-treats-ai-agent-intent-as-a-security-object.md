---
title: New framework treats AI agent intent as a security object
date: '2026-11-14'
pillar: security
status: draft
relevance: 85
source_name: arXiv · Cryptography and Security
source_url: https://arxiv.org/abs/2611.16122
source_kind: research
named_incident: false
needs_primary_source: false
summary: Researchers introduced Intent-Aware Security, a framework that defines agent intent as a first-class security object to detect deviations from organizational purpose. The approach uses an Intent Profile derived from role and developer constraints. It was evaluated on a benchmark of 887 samples across 35 agents and over 10,000 AgentDojo trajectories, showing improved detection of out-of-scope actions compared to profile-free baselines.
why_it_matters: This may help data and AI teams detect subtle agent misalignment that traditional security controls miss, potentially reducing risks from agents acting within permissions but outside their intended role.
my_take: ''
facts_to_check:
- 887 validated samples
- 35 agents
- four-class acro-F1 from 45% to 79%
- Out-of-Scope F1 from 8% to 76%
- more than 10,000 executed AgentDojo trajectories
drafted_with: groq/qwen/qwen3.8-27b
---


