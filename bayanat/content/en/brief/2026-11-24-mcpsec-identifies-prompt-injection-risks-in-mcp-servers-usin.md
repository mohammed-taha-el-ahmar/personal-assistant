---
title: MCPSEC identifies prompt injection risks in MCP servers using metadata only
date: '2026-11-24'
pillar: security
status: draft
relevance: 85
source_name: arXiv · Cryptography and Security
source_url: https://arxiv.org/abs/2609.10854
source_kind: research
named_incident: false
needs_primary_source: false
summary: Researchers introduced MCPSEC, a prototype that audits Model Context Protocol (MCP) servers for indirect prompt injection vulnerabilities using only tool metadata. In a study of 20 servers with 177 tools, human evaluators confirmed 95 vulnerabilities. MCPSEC identified 94 of these, achieving 98.9% recall, outperforming an agentic baseline that found 81. This approach allows analysts to hypothesize vulnerabilities without direct system access.
why_it_matters: Data and AI teams may be able to assess security risks in third-party MCP integrations earlier in the procurement or integration process, relying solely on exposed metadata rather than requiring full system access.
my_take: ''
facts_to_check:
- 20 widely deployed MCP servers
- 177 tools
- 95 confirmed vulnerable tools
- 94 identified by MCPSEC
- 98.9% recall for MCPSEC
- 81 identified by agentic baseline
- 85.3% recall for agentic baseline
drafted_with: groq/qwen/qwen3.8-27b
---


