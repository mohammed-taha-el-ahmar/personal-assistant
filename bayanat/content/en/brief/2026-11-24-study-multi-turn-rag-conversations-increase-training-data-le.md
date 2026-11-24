---
title: 'Study: Multi-turn RAG conversations increase training-data leakage risk'
date: '2026-11-24'
pillar: security
status: draft
relevance: 80
source_name: arXiv · Cryptography and Security
source_url: https://arxiv.org/abs/2611.28748
source_kind: research
named_incident: false
needs_primary_source: false
summary: Researchers introduced CRELT, a framework to track PII leakage in conversational RAG systems. Testing GPT-J-6B and Pythia models using Enron data, they found that while retrieval reduces leakage in single-turn tasks, retaining full conversation history in multi-turn interactions increases disclosure by a factor of 3.6 to 4.9. The study suggests that context length, rather than retrieval content, drives much of this leakage.
why_it_matters: Data teams deploying RAG for customer-facing chatbots may face higher privacy risks in multi-turn sessions than previously estimated, potentially requiring stricter context management or history clearing.
my_take: ''
facts_to_check:
- CRELT framework name
- GPT-J-6B, Pythia-6.9B, Pythia-12B models
- Enron contact details used as target PII
- 29-53% exclusion rate for raw matches
- 91-99.5% reduction reproduction under cleared history
- 47-78% reduction reproduction under full history
- 3.6-4.9x increase in disclosure with full history
drafted_with: groq/qwen/qwen3.8-27b
---


