---
title: Study finds 49.6% of LLM agent skills use dependencies with known CVEs
date: '2026-11-24'
pillar: security
status: draft
relevance: 75
source_name: arXiv · Cryptography and Security
source_url: https://arxiv.org/abs/2611.30932
source_kind: research
named_incident: false
needs_primary_source: false
summary: Researchers analyzed 48,682 skills in the ClawHub registry to assess supply chain risks. They found that 49.6% of skills with resolvable dependencies rely on versions with known CVEs. Notably, 78.3% of these were vulnerable at publication. However, static analysis and sandbox testing showed that agent input reaches the vulnerable code in only 3.0% of affected skills, suggesting limited immediate exploitability.
why_it_matters: Data and AI teams integrating third-party agent skills should verify dependency security, as nearly half contain known vulnerabilities, though direct exploitation via prompt injection appears rare in current samples.
my_take: ''
facts_to_check:
- 48,682 skills in ClawHub
- 49.6% of skills with resolvable dependencies depend on a version with a known CVE
- 78.3% of those are born vulnerable
- 3.0% of affected skills have agent input reaching the vulnerable function
- 3,428 cases flagged by detectors
drafted_with: groq/qwen/qwen3.8-27b
---


