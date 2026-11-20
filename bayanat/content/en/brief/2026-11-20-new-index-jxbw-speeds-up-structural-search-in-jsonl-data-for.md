---
title: New index jXBW speeds up structural search in JSONL data for RAG systems
date: '2026-11-20'
pillar: llm
status: draft
relevance: 65
source_name: arXiv · Databases
source_url: https://arxiv.org/abs/2508.12536
source_kind: research
named_incident: false
needs_primary_source: false
summary: Researchers introduced jXBW, a compressed index for JSON Lines (JSONL) data. It enables direct structural retrieval for RAG systems, avoiding the need to rebuild structure from text on every query. The method uses a merged tree representation and XBW encoding to perform substructure searches. Experiments on seven datasets, including PubChem and OpenStreetMap, show query costs grow with matches rather than total collection size.
why_it_matters: This may reduce latency and storage overhead for teams using structured JSONL data in RAG pipelines by enabling faster substructure searches without full collection scans.
my_take: ''
facts_to_check:
- jXBW
- JSON Lines (JSONL)
- eXtended Burrows-Wheeler Transform (XBW)
- PubChem (1 million compounds)
- OpenStreetMap (6.6 million objects)
- seven real-world datasets
drafted_with: groq/qwen/qwen3.8-27b
---


