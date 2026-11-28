---
title: Study shows GPU timing can infer LLM agent approval policies
date: '2026-11-28'
pillar: security
status: draft
relevance: 70
source_name: arXiv · Cryptography and Security
source_url: https://arxiv.org/abs/2611.16158
source_kind: research
named_incident: false
needs_primary_source: false
summary: Researchers presented PolicySniff, a method to infer an LLM agent's approval policy state via shared-GPU execution. By timing GPU kernels during task processing, a co-resident attacker can distinguish between different policy settings. In a blinded study on a sparse mixture-of-experts runtime, the method achieved 94.17% balanced accuracy. The findings suggest that behavioral compliance does not guarantee configuration confidentiality.
why_it_matters: Data and AI teams sharing GPU infrastructure may need to measure policy distinguishability and enforce authorization outside the model to prevent configuration leakage.
my_take: ''
facts_to_check:
- 94.17% balanced accuracy
- 88.82% accuracy on same-decision tasks
- 91.98% accuracy on differing-decision tasks
- arXiv:2611.16158
drafted_with: groq/qwen/qwen3.8-27b
---


