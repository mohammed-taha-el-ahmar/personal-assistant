---
title: DataHub v1.6.0.4 patches security flaws in GMS and Python client
date: '2026-11-08'
pillar: security
status: approved
relevance: 70
source_name: DataHub releases
source_url: https://github.com/datahub-project/datahub/releases/tag/v1.6.0.4
source_kind: open_source
named_incident: false
needs_primary_source: false
summary: DataHub released v1.6.0.4, a patch for the v1.6.0 LTS line focusing on security. It addresses October CVEs, restricts Java deserialization in GMS's embedded Hazelcast to an allow-list, and tightens system client credential handling in the Python client. Standard deployments require no action, though rolling upgrades may see temporary search cache key eviction warnings.
why_it_matters: Teams using DataHub must ensure their extensions comply with the new Hazelcast serialization allow-list to avoid runtime exceptions during deserialization.
my_take: "DataHub is a centralized metadata platform and data catalog used for data discovery, lineage tracing, and governance. DataHub Python library (acryl-datahub) is used to automate metadata ingestion from different sources (like Snowflake or Airflow) and programmatically interact with DataHub’s APIs.
Engineering Breakdown
• Hazelcast Java Deserialization Allow-list (Critical): This mitigates a major security risk—untrusted Java deserialization often leads to Remote Code Execution (RCE). The catch: If we wrote custom Java extensions or plugins for DataHub, they will crash in production unless their classes are explicitly added to this new allow-list.
• Tightened Python Client Credentials (High): This secures how service tokens are handled during automated jobs. It reduces the risk of credential leaks in log files across our CI/CD and Airflow pipelines.
• Rolling Upgrade Cache Evictions (Low): This means the deployment is safe for zero-downtime environments. Users might experience minor, temporary latency in the UI search bar while the cache rebuilds, but the system won't go down.
Action Plan
1. Audit Extensions: Check if we use any custom Java plugins that require Hazelcast configuration.
2. Bump Dependencies: Update acryl-datahub in our orchestration/Airflow requirements.txt.
3. Staging Test: Deploy to Staging, run a full metadata sync, and check logs for deserialization errors before hitting Production."
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


