---
title: DataHub v1.6.0.4 patches security flaws in GMS and Python client
date: '2026-11-08'
pillar: security
status: draft
relevance: 70
source_name: DataHub releases
source_url: https://github.com/datahub-project/datahub/releases/tag/v1.6.0.4
source_kind: open_source
named_incident: false
needs_primary_source: false
summary: DataHub released v1.6.0.4, a patch for the v1.6.0 LTS line focusing on security. It addresses October CVEs, restricts Java deserialization in GMS's embedded Hazelcast to an allow-list, and tightens system client credential handling in the Python client. Standard deployments require no action, though rolling upgrades may see temporary search cache key eviction warnings.
why_it_matters: Teams using DataHub must ensure their extensions comply with the new Hazelcast serialization allow-list to avoid runtime exceptions during deserialization.
my_take: ''
facts_to_check:
- v1.6.0.4
- v1.6.0 LTS
- October CVEs
- port 5701
- CACHE_TTL_SECONDS 10 minutes
- SEARCH_SERVICE_HAZELCAST_SERIALIZATION_ALLOWED_CLASSES
- SEARCH_SERVICE_HAZELCAST_SERIALIZATION_ALLOWED_PACKAGE_PREFIXES
- HazelcastSerializationException
drafted_with: groq/qwen/qwen3.8-27b
---


