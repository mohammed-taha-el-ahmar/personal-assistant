# Projects & Technical Demos — Summary

### Real-time e-commerce clickstream personalization on AWS [Complete]
Streaming pipeline that ranks top-K products per click end-to-end in under a second: Kinesis ingest → Lambda enrichment with DynamoDB feature lookup → LightGBM ranker → Redshift streaming ingestion → sub-second recommendation API. 60+ tests pass offline with zero cloud calls.
Architecture: POST /events → FastAPI Producer → Kinesis (raw) → Lambda Enricher [DynamoDB feature lookup (user + product) | In-memory session features | LightGBM ranker (top-K)] → Kinesis (enriched) → Redshift Streaming Ingestion (MV) → dbt (staging → marts) → FastAPI Recommender API + Dashboard
Stack: Kinesis, Lambda, DynamoDB, Redshift Serverless, Streaming Ingestion, LightGBM, dbt, FastAPI, Terraform, Python, Real-Time ML, Personalization
GitHub: https://github.com/mohammed-taha-el-ahmar/pulsecart

### IncidentCouncil (Hierarchical Multi-Agent Incident Response) [Live]
A hierarchical multi-agent system for data-platform incident response — an Incident Commander supervisor delegates in parallel to four specialist agents (Metrics Forensics, Lineage Detective, Change Correlator, Runbook Historian), each running its own bounded tool-calling loop against real backends, and synthesises a structured brief with hypothesis, severity, blast radius, and remediation in seconds instead of manual swivel-chairing across warehouse, lineage graph, deploy feed, and runbook wiki.
Architecture: Incident Alert → FastAPI → Incident Commander (Claude 3.5 Sonnet / Groq llama-3.3-70b) → [Metrics Specialist (DuckDB / Athena) | Lineage Specialist (JSON manifest / S3) | Changes Specialist (deploy+IAM feed / DynamoDB) | Runbooks Specialist (TF-IDF / Bedrock KB on OpenSearch Serverless)] → Structured Brief + Attempt Trail UI
Stack: Multi-Agent, LLM, Groq, AWS Bedrock, OpenSearch Serverless, Lambda, DynamoDB, Terraform, FastAPI, DuckDB, TF-IDF, Python, Incident Response
GitHub: https://github.com/mohammed-taha-el-ahmar/incidentcouncil

### DocuSense — Document Intent Classifier + LLM Reasoning (Azure ML) [Live]
A two-route document intelligence service on Azure ML managed endpoints — a millisecond-scale LightGBM intent classifier handles 80% of traffic without calling GPT, while the reasoning route chains PII scrub, hybrid RAG retrieval, tool calling, structured outputs, and citation/safety guardrails through GPT-5.1, with LLM-as-judge evals running nightly to catch prompt regressions before they reach production.
Architecture: POST /classify → LightGBM head (embeddings) → fast route | POST /reason → Presidio PII scrub → Azure AI Search (hybrid vector + keyword) → GPT-5.1 (tool calling + json_schema structured output) → citation guardrail + Azure Content Safety → response | AML Training Pipeline: blob storage → train classifier → evaluate (gate on F1) → register model | Nightly: App Insights traces → LLM-as-judge (rubric scorer) → baseline comparison → GitHub issue on regression
Stack: Azure, Azure ML, Azure OpenAI, AI Search, Content Safety, LightGBM, FastAPI, Terraform, RAG, Structured Outputs, Tool Calling, Guardrails, LLM-as-Judge, MLflow, Python
GitHub: https://github.com/mohammed-taha-el-ahmar/docusense-ai-azure

### SignalFlow — Predictive Maintenance MLOps on Azure [Live]
An end-to-end MLOps platform that trains a binary failure-risk classifier on industrial sensor telemetry, registers versions in Azure ML Model Registry with pipeline-gated quality checks, deploys behind a managed online endpoint with blue/green traffic shifting, and monitors data drift on a schedule — all provisioned by Terraform and driven by GitHub Actions, cutting the path from experiment to production deployment to a single `git tag`.
Architecture: Sensor Parquet → Azure ML Pipeline (prepare → train → gate) → Model Registry (PR-AUC gated) → Managed Online Endpoint (blue/green) → FastAPI + vanilla JS Dashboard (local/Azure toggle) · Evidently drift monitor → App Insights + GitHub Issue · Terraform (workspace, storage, ACR, Key Vault, Log Analytics, compute cluster)
Stack: Azure ML, MLOps, LightGBM, Terraform, GitHub Actions, FastAPI, MLflow, Evidently, Blue/Green Deployment, Python
GitHub: https://github.com/mohammed-taha-el-ahmar/signalflow-mlops-azure

### Real-Time IoT Anomaly Detection Pipeline [Live]
Detects equipment anomalies in real time from streaming sensor data, before they become costly failures.
Architecture: Sensor simulator → Kafka (partitioned by device) → Spark Structured Streaming → Delta Lake (bronze / silver / gold) → Alert dashboard
Stack: Kafka, Spark Structured Streaming, Delta Lake, Python, Docker Compose
GitHub: https://github.com/mohammed-taha-el-ahmar/iot-anomaly-pipeline

### Self-Healing Daily Pipeline with Airflow [Live]
A daily ingestion pipeline that catches bad data before it reaches dashboards — and explains exactly what broke and why.
Architecture: Source API → Airflow DAG (extract → validate → load) → Data quality gate (pass → warehouse table / fail → quarantine + Slack alert)
Stack: Apache Airflow, Python, Great Expectations, Postgres, Docker Compose
GitHub: https://github.com/mohammed-taha-el-ahmar/self-healing-pipeline

### Agentic Root-Cause Investigator for the Self-Healing Pipeline [Live]
When bad data lands in quarantine, an LLM-powered agent investigates why — pulling its own evidence from logs, validation results, and schema diffs — and ships a structured incident report to Slack without a human opening a single tab.
Architecture: Quarantine event → Airflow task (trigger_rule=all_done) → pre-check: quarantine count == 0 → skip / > 0 → Groq tool-calling agent → evidence tools (quarantine table, GE results, Airflow logs, schema diff) → structured JSON verdict → Markdown report + Slack alert
Stack: Apache Airflow, Groq, Tool-Calling Agent, Great Expectations, Postgres, Slack
GitHub: https://github.com/mohammed-taha-el-ahmar/self-healing-pipeline/airflow-rca-agent

### Analytics Engineering with dbt + Snowflake [Live]
Transforms raw operational data into trusted, tested business metrics — with full lineage so any number can be traced back to its source.
Architecture: Raw source tables → Snowflake → dbt (staging → intermediate → marts) → tested, documented models → BI tool
Stack: dbt, Snowflake, SQL, GitHub Actions
GitHub: https://github.com/mohammed-taha-el-ahmar/analytics-engineering-dbt

### NL-to-SQL Agent over dbt Marts [Live]
Lets anyone query trusted dbt marts in plain English — the agent grounds itself in dbt's own schema metadata, validates every query before it touches a database, and self-corrects when it gets the SQL wrong.
Architecture: Plain-English question → Groq agent → SQL generated against dbt manifest schema → sqlglot guard (read-only, catalog-bound, row-limited) → DuckDB demo / Snowflake prod → self-correction on failure → result + attempt trail
Stack: dbt, Snowflake, DuckDB, Groq, FastAPI, Agentic AI
GitHub: https://github.com/mohammed-taha-el-ahmar/analytics-engineering-dbt/dbt-nl-sql-agent

### Serverless Data Lakehouse on AWS [Live]
Ingests a live API into a queryable S3 data lake — Glue handles schema and transformation, Redshift Spectrum queries the lake directly with no load step.
Architecture: API → Lambda (ingest) → S3 raw/ → Glue Crawler → Glue Catalog → Glue ETL (Spark) → S3 processed/ (Parquet) → Glue Crawler → Redshift Spectrum → API Gateway → Front
Stack: AWS, Lambda, Glue, Redshift Spectrum, S3, Terraform, Python, LocalStack
GitHub: https://github.com/mohammed-taha-el-ahmar/aws-data-pipeline

### Clinical Trial Signal Detection (Real-Time Pharmacovigilance) [Live]
A real-time pharmacovigilance pipeline that monitors adverse event streams across clinical trial sites — Event Hub ingests reports, Stream Analytics applies tumbling-window detection in seconds, Synapse SQL Pool persists signals, and a FastAPI dashboard surfaces safety alerts live, cutting signal detection latency from days to minutes.
Architecture: Trial Sites → Event Hub (adverse-events) → Stream Analytics (10-min tumbling window, GROUP BY + HAVING) → Event Hub (signal-alerts) + ADLS Gen2 (bronze/) → Synapse Dedicated SQL Pool → FastAPI + vanilla JS Dashboard
Stack: Azure, Event Hubs, Stream Analytics, Synapse Analytics, ADLS Gen2, FastAPI, Terraform, Pharmacovigilance, Real-Time, Python
GitHub: https://github.com/mohammed-taha-el-ahmar/clinical-trial-signal-detection

### Event-Driven Pipeline on GCP [Live]
Streams live weather data through Cloud Functions into BigQuery — fully serverless, with Eventarc wiring so each stage triggers the next. A Cloud Run frontend displays the latest observation in real time.
Architecture: Open-Meteo API → Cloud Scheduler → Cloud Function (ingest) → Cloud Storage raw/ → Eventarc trigger → Cloud Function (transform) → BigQuery → Cloud Function (latest) → Cloud Run (frontend)
Stack: GCP, Cloud Functions, BigQuery, Cloud Storage, Eventarc, Cloud Run, Terraform, Python, uv, Ruff, CI/CD, Docker
GitHub: https://github.com/mohammed-taha-el-ahmar/gcp-data-pipeline

### ADF-Orchestrated Pipeline on Azure [Live]
Uses Azure Data Factory as the orchestration backbone — an HTTP Copy Activity lands raw data in ADLS Gen2, an Event Grid-triggered Azure Function transforms it, and Azure SQL serves it via a live dashboard on Static Web Apps, showing the native Azure integration pattern most teams actually use.
Architecture: API → ADF Pipeline (HTTP Copy Activity) → ADLS Gen2 raw/ → Event Grid → Azure Function (transform) → Azure SQL Database (serverless) → Static Web App Dashboard
Stack: Azure, Data Factory, ADLS Gen2, Azure Functions, Event Grid, Azure SQL, Static Web Apps, Terraform, Python
GitHub: https://github.com/mohammed-taha-el-ahmar/azure-data-pipeline

### Airflow on Kubernetes — Orchestration Capstone [Live]
Runs the same ingest + transform logic as the cloud-native projects, but you own the orchestration layer — showing when and why you'd choose a portable scheduler over vendor-specific triggers.
Architecture: Airflow (Helm on K8s) → Task: ingest pod → object storage → Task: transform pod → warehouse
Stack: Kubernetes, Airflow, Helm, Docker, Python
GitHub: https://github.com/mohammed-taha-el-ahmar/k8s-airflow-data-platform
