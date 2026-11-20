---
title: 'Study: Multi-tool RAG agents outperform document-only systems in enterprise QA'
date: '2026-11-20'
pillar: llm
status: draft
relevance: 65
source_name: arXiv · Cryptography and Security
source_url: https://arxiv.org/abs/2611.19333
source_kind: research
named_incident: false
needs_primary_source: false
summary: Researchers evaluated Orbit AI, a tool-augmented RAG system using a ReAct agent, for answering enterprise questions across three workspace sources. In a held-out set of 80 questions, the full agent using Gemini 3.5 Flash Lite achieved 86.25% accuracy. This significantly exceeded document-only RAG (60.00%) and standalone LLMs (23.13%). For multi-source queries, the agent’s accuracy was 84.38% versus 40.63% for document-only RAG.
why_it_matters: The findings suggest that integrating multiple data sources via agentic workflows may substantially improve answer accuracy for complex enterprise queries compared to traditional single-source RAG approaches.
my_take: ''
facts_to_check:
- 80 questions in the held-out evaluation set
- Gemini 3.5 Flash Lite accuracy of 86.25%
- Document-only RAG accuracy of 60.00%
- Plain LLM accuracy of 23.13%
- 'Multi-source question accuracy: 84.38% (agent) vs 40.63% (document-only)'
- Llama 3.2 overall correctness of 5.50%
- Llama 3.2 full-agent accuracy of 52.50%
drafted_with: groq/qwen/qwen3.8-27b
---


