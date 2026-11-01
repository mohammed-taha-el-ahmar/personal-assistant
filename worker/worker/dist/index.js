var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, 'name', { value, configurable: true });

// src/config.js
var DEFAULTS = {
  // Llama 3.3 70B was shut down on Groq (Aug 2026). gpt-oss / Qwen are the supported replacements.
  MODEL: 'openai/gpt-oss-120b',
  MODEL_FALLBACKS: 'openai/gpt-oss-20b,qwen/qwen3.8-27b',
  GROQ_URL: 'https://api.groq.com/openai/v1/chat/completions',
  GROQ_TIMEOUT_MS: 25e3,
  // Token budgets — sized for small-context / low-TPM models. Total prompt ≈ 300 + context + history.
  CONTEXT_TOKENS: 1800,
  // retrieved knowledge chunks
  HISTORY_TOKENS: 700,
  // previous turns
  // Output budget. On reasoning models (gpt-oss, Qwen) hidden reasoning tokens count against it,
  // so it must leave room for reasoning + a ~250-word answer. It does not enlarge the prompt.
  MAX_COMPLETION_TOKENS: 2048,
  MAX_CONTINUATIONS: 1,
  // automatic "continue" calls when an answer is still cut off
  MAX_QUESTION_CHARS: 1e3,
  MAX_JD_CHARS: 3e3,
  RATE_LIMIT: 30,
  // requests per IP per window
  RATE_WINDOW_MS: 60 * 60 * 1e3,
};
var int = /* @__PURE__ */ __name((v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d), 'int');
function settings(env = {}) {
  const models = [env.MODEL || DEFAULTS.MODEL, ...(env.MODEL_FALLBACKS ?? DEFAULTS.MODEL_FALLBACKS).split(',')]
    .map((m) => m.trim())
    .filter((m, i, all) => m && all.indexOf(m) === i);
  return {
    models,
    calLink: env.CAL_LINK || 'https://cal.eu/mohammed-taha-el-ahmar',
    allowedOrigins: (env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    contextTokens: int(env.CONTEXT_TOKENS, DEFAULTS.CONTEXT_TOKENS),
    historyTokens: int(env.HISTORY_TOKENS, DEFAULTS.HISTORY_TOKENS),
    maxCompletionTokens: int(env.MAX_COMPLETION_TOKENS, DEFAULTS.MAX_COMPLETION_TOKENS),
  };
}
__name(settings, 'settings');

// src/http.js
function corsHeaders(origin, allowedOrigins) {
  const allow = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
__name(corsHeaders, 'corsHeaders');
function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
__name(json, 'json');
function errorJson(message, status, cors) {
  return json({ error: { message } }, status, cors);
}
__name(errorJson, 'errorJson');

// src/ratelimit.js
var buckets = /* @__PURE__ */ new Map();
function isRateLimited(ip, now = Date.now()) {
  const entry = buckets.get(ip) ?? { count: 0, windowStart: now };
  if (now - entry.windowStart > DEFAULTS.RATE_WINDOW_MS) {
    entry.count = 1;
    entry.windowStart = now;
  } else {
    entry.count++;
  }
  buckets.set(ip, entry);
  return entry.count > DEFAULTS.RATE_LIMIT;
}
__name(isRateLimited, 'isRateLimited');

// src/generated/kb.js
var kb_default = {
  chunks: [
    {
      id: 'resume:profile',
      doc: 'resume',
      label: 'Resume',
      title: 'Profile',
      text: '- **Title:** Senior Cloud Data Engineer\n- **Location:** Paris, France\n- **Email:** med.taha.elahmar@gmail.com\n- **LinkedIn:** linkedin.com/in/mohammed-taha-el-ahmar\n- **Experience:** 9+ years designing scalable data pipelines, optimizing big data infrastructure, and driving data-informed decisions.',
      pinned: true,
    },
    {
      id: 'resume:project-1-centralized-data-hub-june-2024',
      doc: 'resume',
      label: 'Resume',
      title:
        'Current Role \u2014 TotalEnergies (July 2023 \u2013 Present) \u203A Project 1: Centralized Data Hub (June 2024 \u2013 now)',
      text: '**Senior Cloud Data Engineer**, Paris\nBuilding a Data Hub for Refinery & Chemistry data products.\n- Scalable ingestion & transformation pipelines (PySpark, Azure Data Lake)\n- GenAI-powered Text-to-SQL backend using an internal RAG client\n- Lakehouse optimization with Delta Lake best practices\n- Databricks compute cost reduction via cluster tuning\n- Data quality and observability frameworks\n- CI/CD automation: GitHub Actions, Terraform, Liquibase\n**Tech:** PySpark, Python, Pytest, Azure Databricks, Databricks SQL Warehouse, Azure Data Lake, GitHub Actions, Terraform, Liquibase',
    },
    {
      id: 'resume:project-2-maintenance-planning-app-11-mo',
      doc: 'resume',
      label: 'Resume',
      title:
        'Current Role \u2014 TotalEnergies (July 2023 \u2013 Present) \u203A Project 2: Maintenance Planning App (11 months)',
      text: 'Maintenance planning application for Oil & Gas extraction platforms.\n- Daily batch ETL with Azure Functions, Durable Functions, Azure Data Lake\n- ETL refactoring: clean architecture, improved test coverage\n- CI/CD pipelines (GitHub Actions, Gitflow)\n- Terraform IaC across Azure environments\n- Internal training sessions: Databricks, GenAI, Data quality\n**Tech:** Python, Pytest, SQL, Azure Functions & Durable Functions, Azure Service Bus, Gitflow, Azure Data Lake, Azure SQL Database, Terraform, Docker',
    },
    {
      id: 'resume:toyota-1-year',
      doc: 'resume',
      label: 'Resume',
      title: 'Previous Role \u2014 Deloitte Consulting (2017 \u2013 June 2023) \u203A Toyota (1 year)',
      text: '**Senior Data Engineer**, Paris\nETL pipelines for operational and marketing analytics.\n- Spark/Databricks notebooks \u2192 scalable big data ETL\n- Data quality checks on Azure SQL Database\n- Training for client data analysts\n**Tech:** Python, PySpark, Databricks, Azure Blob Storage, Azure SQL Database',
    },
    {
      id: 'resume:sanofi-6-months',
      doc: 'resume',
      label: 'Resume',
      title: 'Previous Role \u2014 Deloitte Consulting (2017 \u2013 June 2023) \u203A Sanofi (6 months)',
      text: 'ETL for competitive pricing scenario analysis.\n- Python pricing model with graph analytics (networkit, networkx)\n- Unit tests with pytest; ETL on Databricks + AWS S3\n**Tech:** Python (pandas, numpy, networkit, networkx, pytest, koalas), Gitlab, Databricks, AWS S3',
    },
    {
      id: 'resume:french-ministry-of-justice-2-5-years',
      doc: 'resume',
      label: 'Resume',
      title:
        'Previous Role \u2014 Deloitte Consulting (2017 \u2013 June 2023) \u203A French Ministry of Justice (2.5 years)',
      text: 'HR payroll ops, regulatory reporting, gender equality KPI tracking.\n- BI reports: SAP BusinessObjects, Power BI, SQL Developer\n- AI document parser using OCR & NLP (Textract, NLTK, Spacy)\n- Skills management PoC (NLP)\n- Employee churn forecasting (ML)\n- Employee-to-job matching PoC (NLP semantic similarity)\n**Tech:** SQL Developer, SAP BusinessObjects, Power BI, Cloudera, Python (NLTK, Spacy, Pandas, Numpy, Textract)',
    },
    {
      id: 'resume:earlier-experience',
      doc: 'resume',
      label: 'Resume',
      title: 'Earlier Experience',
      text: '- **Data Analyst \u2014 Michelin**, Clermont-Ferrand (2016, 1 year): SQL analytics for Order to Cash B2B platform, Agile/Lean delivery.\n- **Big Data Engineer Intern \u2014 Tessi**, Grenoble (2015): Spark vs MapReduce benchmark; Spark+Cassandra pipeline; MLlib models; Zeppelin dashboards.',
    },
    {
      id: 'resume:certifications',
      doc: 'resume',
      label: 'Resume',
      title: 'Certifications',
      text: '- AWS Solutions Architect Associate (2022)\n- Google Professional Data Engineer (2023)\n- Databricks Data Engineer Associate (2024)\n- AWS Data Engineer Associate (2024)\n- Databricks Data Enginner Professional (2024)\n- Azure Data Engineer Associate (2024)\n- Databricks Generative AI Associate (2024)',
    },
    {
      id: 'resume:core-skills',
      doc: 'resume',
      label: 'Resume',
      title: 'Core Skills',
      text: '- **Cloud:** Azure (Expert), AWS (S3, EC2, IAM \u2013 working knowledge)\n- **Languages:** Python, PySpark, SQL\n- **DevOps:** GitHub Actions, Terraform, Gitflow, Docker, Kubernetes\n- **Data & ML Tools:** Databricks, Azure Data Lake, Power BI, SAP BO, MLlib, Spacy, NLTK\n- **Practices:** CI/CD, TDD, Observability, Cost Optimization, NLP, Agile Delivery',
    },
    {
      id: 'resume:education',
      doc: 'resume',
      label: 'Resume',
      title: 'Education',
      text: '- **2016** \u2014 Grenoble-INP ENSIMAG (France), Engineering Degree, Major in Big Data & Machine Learning\n- **2012** \u2014 Post-baccalaureate prep (Math & Physics, Morocco) for Grandes \xC9coles\n- **2010** \u2014 High school diploma (Morocco)',
    },
    {
      id: 'resume:languages',
      doc: 'resume',
      label: 'Resume',
      title: 'Languages',
      text: 'English (fluent), French (fluent), Arabic (native)',
    },
    {
      id: 'resume:activities',
      doc: 'resume',
      label: 'Resume',
      title: 'Activities',
      text: '- Public Speaking (Toastmasters member since 2018)\n- Coding katas (TDD, TCR)\n- Article writing on Data & AI (Medium.com)',
    },
    {
      id: 'faq:is-he-currently-looking-for-a-new-role',
      doc: 'faq',
      label: 'FAQ',
      title: 'Availability & Work Preferences \u203A Is he currently looking for a new role?',
      text: 'Yes, Mohammed Taha is open to new opportunities. He is actively exploring senior or lead data engineering roles.',
    },
    {
      id: 'faq:what-type-of-contract-is-he-looking-for',
      doc: 'faq',
      label: 'FAQ',
      title: 'Availability & Work Preferences \u203A What type of contract is he looking for?',
      text: 'He is open to full-time permanent positions (CDI) as well as long-term consulting missions.',
    },
    {
      id: 'faq:is-he-open-to-remote-work',
      doc: 'faq',
      label: 'FAQ',
      title: 'Availability & Work Preferences \u203A Is he open to remote work?',
      text: 'Yes, he is comfortable with full remote, hybrid, or on-site arrangements in the Paris region.',
    },
    {
      id: 'faq:is-he-open-to-relocation',
      doc: 'faq',
      label: 'FAQ',
      title: 'Availability & Work Preferences \u203A Is he open to relocation?',
      text: 'He is based in Paris and open to discussing relocation for the right opportunity.',
    },
    {
      id: 'faq:what-is-his-notice-period',
      doc: 'faq',
      label: 'FAQ',
      title: 'Availability & Work Preferences \u203A What is his notice period?',
      text: 'To be discussed \u2014 please book a call for details.',
    },
    {
      id: 'faq:what-are-his-salary-expectations',
      doc: 'faq',
      label: 'FAQ',
      title: 'Availability & Work Preferences \u203A What are his salary expectations?',
      text: 'He prefers to discuss compensation on a call. Please book a slot to align on expectations.',
    },
    {
      id: 'faq:what-industries-has-he-worked-in',
      doc: 'faq',
      label: 'FAQ',
      title: 'Background \u203A What industries has he worked in?',
      text: 'Energy (TotalEnergies), Consulting (Deloitte), Automotive (Toyota), Pharmaceutical (Sanofi), Public Sector (French Ministry of Justice), Tire manufacturing (Michelin).',
    },
    {
      id: 'faq:does-he-have-experience-with-genai',
      doc: 'faq',
      label: 'FAQ',
      title: 'Background \u203A Does he have experience with GenAI?',
      text: 'Yes \u2014 at TotalEnergies he built a GenAI-powered Text-to-SQL backend using an internal RAG client, enabling natural language querying of data assets.\nHe has also built an agent to accelerate the development of data products. His work enabled the business to cut the time to deploy new data products to half.',
    },
    {
      id: 'faq:has-he-managed-teams-or-mentored-enginee',
      doc: 'faq',
      label: 'FAQ',
      title: 'Background \u203A Has he managed teams or mentored engineers?',
      text: 'He has delivered internal training sessions and workshops on Databricks, GenAI, Data quality, AWS Storage, and code testing. He is also a member of two starter kit management committees at TotalEnergies.',
    },
    {
      id: 'faq:does-he-speak-english-fluently',
      doc: 'faq',
      label: 'FAQ',
      title: 'Background \u203A Does he speak English fluently?',
      text: 'Yes \u2014 English, French, and Arabic, all at a professional/fluent level.',
    },
    {
      id: 'faq:how-can-i-schedule-a-call-with-him',
      doc: 'faq',
      label: 'FAQ',
      title: 'Booking \u203A How can I schedule a call with him?',
      text: 'Book a free 30-minute intro call directly at: https://cal.eu/mohammed-taha-el-ahmar',
    },
    {
      id: 'faq:how-can-i-check-his-certifications',
      doc: 'faq',
      label: 'FAQ',
      title: 'Certifications \u203A How can I check his certifications?',
      text: 'Access his certifications / credentials at: https://credentials.databricks.com/profile/mohammedtahaelahmar398779/wallet',
    },
    {
      id: 'projects:context-data-lake-house-for-refinery-and',
      doc: 'projects',
      label: 'Work projects',
      title:
        'TotalEnergies \xB7 Paris \xB7 Jul 2023 \u2013 Present \u203A Context: Data Lake House for Refinery and Chemistry data products (June 2024 \u2013 Present)',
      text: 'Key Projects \u2014 Mohammed Taha EL AHMAR\n- Built a GenAI-powered backend that allows business users to query refinery and chemistry data using natural language. Uses an internal RAG client to retrieve relevant schema context and generate accurate SQL. Reduced time-to-insight for non-technical stakeholders significantly.\n- Implemented data ingestion and transformation jobs triggered using predefined schedules.\n- Optimized end user data query performance using data modeling and delta table storage management best practices.\n- Reduced Databricks usage cost through compute tuning.\n- Developed code quality and data validation features.\n- Evolved CI/CD pipelines.\n**Technologies:** PySpark, Python, Pytest, Databricks SQL Warehouse, Azure Databricks, GitHub Actions, Azure Data Lake, Terraform, Liquibase.',
    },
    {
      id: 'projects:context-maintenance-planning-web-applica',
      doc: 'projects',
      label: 'Work projects',
      title:
        'TotalEnergies \xB7 Paris \xB7 Jul 2023 \u2013 Present \u203A Context: Maintenance planning web application for Oil & Gas extraction platforms (11 months)',
      text: '- Implemented daily batch ETL workflows using Azure services.\n- Improved existing ETL code robustness and test quality with architectural best practices.\n- Developed CI/CD pipelines.\n- Evolved & deployed infrastructure services using Terraform IaC capabilities.\n- Delivered introductory trainings for Data Engineers on: Databricks, Docker, and Kubernetes.\n**Technologies:** Python, Pytest, SQL, Azure Functions & Durable Functions, Azure Service Bus, Gitflow, GitHub Actions, Azure Data Lake, Azure SQL Database, Terraform, APIM.',
    },
    {
      id: 'projects:toyota-1-year-consulting-assignment',
      doc: 'projects',
      label: 'Work projects',
      title: 'Toyota \u2013 1 year consulting assignment',
      text: 'Context: Development and improvement of existing ETL workflows for operational and marketing data analysis.\n- Improved ad hoc notebooks on Spark Databricks to perform big data ETL pipelines.\n- Performed data quality checks in collaboration with data analysts: SQL data querying in Azure SQL Database to detect and fix inconsistencies in data flows.\n- Training of client data analysts to perform data transformations and troubleshooting in Databricks.\n**Technologies:** Python, PySpark, Databricks, Azure Blob Storage, Azure SQL Database.',
    },
    {
      id: 'projects:sanofi-6-months-consulting-assignment',
      doc: 'projects',
      label: 'Work projects',
      title: 'Sanofi \u2013 6 months consulting assignment',
      text: 'Context: Programming of an ETL workflow for competitive pricing scenario analysis and launch of new customer products.\n- Developed and integrated new features to a pricing scenario evaluation model with graph analysis in Python (Agile mode).\n- Increased test coverage.\n- Deployed ETL workflows in Databricks.\n**Technologies:** Python (pandas, numpy, networkit, networkx, pytest, koalas), Gitlab, Databricks, AWS S3.',
    },
    {
      id: 'projects:french-ministry-of-justice-2-5-years-con',
      doc: 'projects',
      label: 'Work projects',
      title: 'French Ministry of Justice \u2013 2.5 years consulting assignment',
      text: 'Context: HR payroll management, regulatory reporting of employee inclusion indicators, gender equality label KPIs.\n- Developed ad-hoc and scheduled BI reports and KPIs using SAP BO, Power BI, and SQL Developer.\n- Implemented data extraction AI use case from PDF documents using NLP & OCR Python libraries.\n- Implemented a skills management PoC with natural language processing technologies.\n- Conducted forecast study on employee churn using Machine Learning models.\n- Developed an AI PoC for matching between employee profiles and internal mobility vacancies using NLP techniques.\n**Technologies:** SQL Developer, SAP Business Object, MS Power BI, Cloudera, Anaconda, Python (NLTK, Spacy, Tkinter, Pandas, Numpy, Textract).',
    },
    {
      id: 'projects:michelin-clermont-ferrand-2016',
      doc: 'projects',
      label: 'Work projects',
      title: 'Michelin \xB7 Clermont-Ferrand \xB7 2016',
      text: 'Context: Order to Cash B2B Tire Ordering Platform.\n- Developed SQL queries for Order to Cash data analysis from multiple source platforms.\n- Process analysis and specifications of business needs.\n- Project planning and progress monitoring with Lean & Agile methodology.\n**Technologies:** SQL Developer, JIRA, bash scripts.',
    },
    {
      id: 'projects:tessi-grenoble-2015',
      doc: 'projects',
      label: 'Work projects',
      title: 'Tessi \xB7 Grenoble \xB7 2015',
      text: 'Context: Tessi Group R&D department.\n- Conducted a comparative study between Apache Spark and Apache MapReduce.\n- Implemented a Big Data processing and analysis system with Spark and Cassandra.\n- Developed Machine Learning forecasting and clustering models with Spark MLlib.\n- Built data visualization dashboards with Apache Zeppelin.\n**Technologies:** Apache Spark, Cassandra, Zeppelin, Hadoop MapReduce.\nAchievements',
    },
    {
      id: 'projects:tessi-grenoble-2015-2',
      doc: 'projects',
      label: 'Work projects',
      title: 'Tessi \xB7 Grenoble \xB7 2015',
      text: 'Mai 2026: 2nd place at the Toastmasters european championship of public seaking in french\nOctober 2025: 1st place, TotalEnergies GRP Espark \xD7 REN Data Race hackathon\nOct 2024 \u2013 now: Member of TDF Databricks starter kit management committee\nSep 2023 \u2013 Sep 2024: Member of TDF Azure Functions starter kit management committee\n2024 \u2013 now: Delivering workshops on Data quality, Databricks certifications, AWS Storage, Code testing',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Real-time e-commerce clickstream personalization on AWS',
      href: 'projects.html#pulsecart',
      id: 'portfolio:pulsecart',
      text: 'Streaming pipeline that ranks top-K products per click end-to-end in under a second: Kinesis ingest \u2192 Lambda enrichment with DynamoDB feature lookup \u2192 LightGBM ranker \u2192 Redshift streaming ingestion \u2192 sub-second recommendation API. 60+ tests pass offline with zero cloud calls.\nStack: Kinesis, Lambda, DynamoDB, Redshift Serverless, Streaming Ingestion, LightGBM, dbt, FastAPI, Terraform, Python, Real-Time ML, Personalization\nCode: https://github.com/mohammed-taha-el-ahmar/pulsecart\nArticle: https://medium.com/@med.taha.elahmar/building-a-real-time-e-commerce-personalization-pipeline-on-aws-697b339e022e',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Real-time e-commerce clickstream personalization on AWS \u203A Design',
      href: 'projects.html#pulsecart',
      id: 'portfolio:pulsecart:design',
      text: 'Architecture: POST /events \u2192 FastAPI Producer \u2192 Kinesis (raw) \u2192 Lambda Enricher [DynamoDB feature lookup (user + product) | In-memory session features | LightGBM ranker (top-K)] \u2192 Kinesis (enriched) \u2192 Redshift Streaming Ingestion (MV) \u2192 dbt (staging \u2192 marts) \u2192 FastAPI Recommender API + Dashboard\n- Scorer parity contract \u2014 SageMakerScorer / LocalLightGBMScorer / ScriptedFakeScorer all implement score(ScoreRequest) \u2192 ScoreResponse; the enricher never branches on which scorer is active, so production Lambda and offline CI execute identical code paths.\n- Offline-first fakes over mocks \u2014 FakeKinesisStream, FakeDynamoTable, and ScriptedFakeScorer implement real behavior (append-only log, BatchGetItem, deterministic scores) rather than asserting call patterns; refactoring internals never breaks tests.',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Real-time e-commerce clickstream personalization on AWS \u203A Design',
      href: 'projects.html#pulsecart',
      id: 'portfolio:pulsecart:design-2',
      text: "- Redshift Streaming MV as raw landing zone \u2014 the MV lands only timestamp + JSON_PARSE(SUPER); all extraction, casting, and business logic lives in dbt, keeping the MV compatible with AUTO REFRESH and avoiding mutable-function restrictions.\n- LightGBM in-Lambda over SageMaker endpoint \u2014 ~130ms cold inference with the model bundled as ranker.joblib avoids SageMaker always-on cost; the SageMakerScorer path exists for production scale but is bypassed by setting endpoint to 'none'.\n- S3-based Lambda deployment from day one \u2014 the enricher zip (numpy + scipy + sklearn + lightgbm) exceeds 50MB inline; deploying via S3 with filebase64sha256 hash avoids the RequestEntityTooLargeException cliff.",
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Real-time e-commerce clickstream personalization on AWS \u203A Design',
      href: 'projects.html#pulsecart',
      id: 'portfolio:pulsecart:design-3',
      text: '- Native library pinning to amazonlinux:2 \u2014 Lambda Python 3.11 runs on AL2 (glibc 2.26); extracting libgomp from amazonlinux:2023 causes GLIBC_2.32 errors; the build script Docker-extracts from the correct base.\n- trace_id minted at ingest, propagated end-to-end \u2014 every Kinesis record, scorer response, and Redshift row carries the same trace_id; any recommendation on the dashboard maps back to the originating click in one query.',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'IncidentCouncil (Hierarchical Multi-Agent Incident Response)',
      href: 'projects.html#incident-council',
      id: 'portfolio:incident-council',
      text: 'A hierarchical multi-agent system for data-platform incident response \u2014 an Incident Commander supervisor delegates in parallel to four specialist agents (Metrics Forensics, Lineage Detective, Change Correlator, Runbook Historian), each running its own bounded tool-calling loop against real backends, and synthesises a structured brief with hypothesis, severity, blast radius, and remediation in seconds instead of manual swivel-chairing across warehouse, lineage graph, deploy feed, and runbook wiki.\nStack: Multi-Agent, LLM, Groq, AWS Bedrock, OpenSearch Serverless, Lambda, DynamoDB, Terraform, FastAPI, DuckDB, TF-IDF, Python, Incident Response\nCode: https://github.com/mohammed-taha-el-ahmar/incidentcouncil',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'IncidentCouncil (Hierarchical Multi-Agent Incident Response) \u203A Design',
      href: 'projects.html#incident-council',
      id: 'portfolio:incident-council:design',
      text: "Architecture: Incident Alert \u2192 FastAPI \u2192 Incident Commander (Claude 3.5 Sonnet / Groq llama-3.3-70b) \u2192 [Metrics Specialist (DuckDB / Athena) | Lineage Specialist (JSON manifest / S3) | Changes Specialist (deploy+IAM feed / DynamoDB) | Runbooks Specialist (TF-IDF / Bedrock KB on OpenSearch Serverless)] \u2192 Structured Brief + Attempt Trail UI\n- Hierarchical delegation over flat tool list \u2014 the supervisor sees only invoke_metrics/lineage/changes/runbooks; it cannot query DuckDB or search runbooks directly, enforcing separation of concerns and keeping each specialist's context window focused on its domain.",
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'IncidentCouncil (Hierarchical Multi-Agent Incident Response) \u203A Design',
      href: 'projects.html#incident-council',
      id: 'portfolio:incident-council:design-2',
      text: "- Bounded tool-calling loops per specialist \u2014 each specialist runs up to N rounds of tool calls independently and reports a structured finding; gracefully degrades with 'ran out of rounds' instead of hanging, preventing runaway token spend.\n- Contract parity between LocalCouncil and BedrockCouncil \u2014 both implement handle(alert) \u2192 CouncilResponse; FastAPI, UI, and tests are backend-agnostic, swapping local Groq for AWS Bedrock Agents changes nothing downstream.\n- ScriptedFakeLLM for deterministic CI \u2014 the LLM is scripted with ordered Say/Call turns so 47 tests run in <1s with zero network calls; tools still execute against real DuckDB, real TF-IDF index, and real JSON fixtures.",
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'IncidentCouncil (Hierarchical Multi-Agent Incident Response) \u203A Design',
      href: 'projects.html#incident-council',
      id: 'portfolio:incident-council:design-3',
      text: "- Static parity between specialist tool_schemas and Lambda _REGISTRY \u2014 if a specialist adds a tool locally, the corresponding Lambda handler must implement it before CI turns green; catches local\u2194cloud drift at build time.\n- TF-IDF locally, Bedrock KB in cloud \u2014 the runbook specialist's tool schema (search_runbooks(query, k) \u2192 matches) is identical in both modes; local uses scikit-learn TF-IDF, cloud uses OpenSearch Serverless with Titan Embed v2 at 400-token chunks with 20% overlap.\n- Supervisor synthesis fallback \u2014 if the final LLM message fails JSON parse, LocalCouncil produces a valid IncidentBrief with the raw text as hypothesis rather than crashing; robustness over strictness at the boundary.",
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'DocuSense \u2014 Document Intent Classifier + LLM Reasoning (Azure ML)',
      href: 'projects.html#docusense-ai-azure',
      id: 'portfolio:docusense-ai-azure',
      text: 'A two-route document intelligence service on Azure ML managed endpoints \u2014 a millisecond-scale LightGBM intent classifier handles 80% of traffic without calling GPT, while the reasoning route chains PII scrub, hybrid RAG retrieval, tool calling, structured outputs, and citation/safety guardrails through GPT-5.1, with LLM-as-judge evals running nightly to catch prompt regressions before they reach production.\nStack: Azure, Azure ML, Azure OpenAI, AI Search, Content Safety, LightGBM, FastAPI, Terraform, RAG, Structured Outputs, Tool Calling, Guardrails, LLM-as-Judge, MLflow, Python\nCode: https://github.com/mohammed-taha-el-ahmar/docusense-ai-azure',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'DocuSense \u2014 Document Intent Classifier + LLM Reasoning (Azure ML) \u203A Design',
      href: 'projects.html#docusense-ai-azure',
      id: 'portfolio:docusense-ai-azure:design',
      text: 'Architecture: POST /classify \u2192 LightGBM head (embeddings) \u2192 fast route | POST /reason \u2192 Presidio PII scrub \u2192 Azure AI Search (hybrid vector + keyword) \u2192 GPT-5.1 (tool calling + json_schema structured output) \u2192 citation guardrail + Azure Content Safety \u2192 response | AML Training Pipeline: blob storage \u2192 train classifier \u2192 evaluate (gate on F1) \u2192 register model | Nightly: App Insights traces \u2192 LLM-as-judge (rubric scorer) \u2192 baseline comparison \u2192 GitHub issue on regression\n- Fast + slow routing with confidence threshold \u2014 LightGBM over hashed bag-of-words embeddings resolves 80% of requests in <5ms without an LLM call; only documents below the confidence gate escalate to the GPT reasoning path, cutting per-request cost by 10\xD7.',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'DocuSense \u2014 Document Intent Classifier + LLM Reasoning (Azure ML) \u203A Design',
      href: 'projects.html#docusense-ai-azure',
      id: 'portfolio:docusense-ai-azure:design-2',
      text: "- Structured outputs via json_schema response_format \u2014 the ReasoningResponse Pydantic model generates the OpenAI JSON schema at build time, guaranteeing parseable responses with zero regex extraction; the same model serves as the API contract and the LLM constraint.\n- Positional args in AML components \u2014 AML strips --flag names that collide with declared input/output names; all pipeline entrypoints use typer.Argument (positional) and accept booleans as strings to survive AML's command rewriting.\n- Semantic ranker as opt-in, not default \u2014 Azure AI Search semantic ranker requires Standard tier and explicit index configuration; the retriever defaults to pure vector + keyword hybrid which works on any tier, with semantic ranking enabled only when explicitly configured.",
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'DocuSense \u2014 Document Intent Classifier + LLM Reasoning (Azure ML) \u203A Design',
      href: 'projects.html#docusense-ai-azure',
      id: 'portfolio:docusense-ai-azure:design-3',
      text: '- ScriptedFakeLLM for deterministic CI \u2014 every test and eval uses a fake LLM with scripted responses, keeping the full suite offline and under 3 seconds; real Azure OpenAI is only invoked in the nightly prompt regression workflow with explicit cost controls.\n- Credential injection at submit/deploy time \u2014 neither pipeline containers nor endpoint containers carry .env files; submit_training_job.py and deploy_endpoint.py read local .env via pydantic-settings and inject credentials as environment variables, keeping secrets out of YAML and Git.',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'DocuSense \u2014 Document Intent Classifier + LLM Reasoning (Azure ML) \u203A Design',
      href: 'projects.html#docusense-ai-azure',
      id: 'portfolio:docusense-ai-azure:design-4',
      text: '- LLM-as-judge with baseline comparison \u2014 the Judge class scores responses on 4 rubric dimensions (1\u20135), compares the mean against a committed baseline JSON, and fails CI if the delta exceeds a configurable threshold; local mode uses a fake judge for zero-cost iteration.',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'SignalFlow \u2014 Predictive Maintenance MLOps on Azure',
      href: 'projects.html#signalflow-mlops-azure',
      id: 'portfolio:signalflow-mlops-azure',
      text: 'An end-to-end MLOps platform that trains a binary failure-risk classifier on industrial sensor telemetry, registers versions in Azure ML Model Registry with pipeline-gated quality checks, deploys behind a managed online endpoint with blue/green traffic shifting, and monitors data drift on a schedule \u2014 all provisioned by Terraform and driven by GitHub Actions, cutting the path from experiment to production deployment to a single `git tag`.\nStack: Azure ML, MLOps, LightGBM, Terraform, GitHub Actions, FastAPI, MLflow, Evidently, Blue/Green Deployment, Python\nCode: https://github.com/mohammed-taha-el-ahmar/signalflow-mlops-azure',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'SignalFlow \u2014 Predictive Maintenance MLOps on Azure \u203A Design',
      href: 'projects.html#signalflow-mlops-azure',
      id: 'portfolio:signalflow-mlops-azure:design',
      text: 'Architecture: Sensor Parquet \u2192 Azure ML Pipeline (prepare \u2192 train \u2192 gate) \u2192 Model Registry (PR-AUC gated) \u2192 Managed Online Endpoint (blue/green) \u2192 FastAPI + vanilla JS Dashboard (local/Azure toggle) \xB7 Evidently drift monitor \u2192 App Insights + GitHub Issue \xB7 Terraform (workspace, storage, ACR, Key Vault, Log Analytics, compute cluster)\n- Positional arguments over --flag options in AML components \u2014 Azure ML strips flag names that collide with declared input/output names; using typer.Argument (positional) is the only reliable pattern for component CLIs.\n- Single feature implementation shared by training and serving \u2014 `build_feature_frame()` is called identically in the pipeline train step and the online scoring script, eliminating training/serving skew by construction rather than by convention.',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'SignalFlow \u2014 Predictive Maintenance MLOps on Azure \u203A Design',
      href: 'projects.html#signalflow-mlops-azure',
      id: 'portfolio:signalflow-mlops-azure:design-2',
      text: '- PR-AUC threshold gate instead of accuracy \u2014 class imbalance (rare failures) makes accuracy misleading; the pipeline gate step rejects models below a PR-AUC floor and tags every registered version with recall-at-precision-90.\n- PYTHONPATH wrapper over pip install in AML \u2014 `aml_run.sh` sets PYTHONPATH=src so the signalflow package is importable without building a wheel, keeping component images cacheable and iteration fast.\n- Skip mlflow.log_artifact when tracking_uri is azureml:// \u2014 AML auto-captures outputs via component mount points; calling log_artifact triggers a conflicting azureml_artifacts_builder path that breaks with mlflow-skinny pre-installed in AML images.',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'SignalFlow \u2014 Predictive Maintenance MLOps on Azure \u203A Design',
      href: 'projects.html#signalflow-mlops-azure',
      id: 'portfolio:signalflow-mlops-azure:design-3',
      text: "- Server-side proxy for Azure endpoint in local frontend \u2014 Azure ML managed endpoints don't return CORS headers; the FastAPI server exposes /proxy/score that forwards requests server-side via httpx, letting the same vanilla JS dashboard score against both local and cloud models.\n- Fallback model path resolution in score.py \u2014 registered models from the pipeline have a nested model/ folder while local models sit at root; init() checks both paths, making the same scoring script work across registration methods without reconfiguration.\n- Soft-delete-aware Terraform lifecycle \u2014 Azure ML workspaces enter soft-delete on destroy; the infra docs and CI include a forceToPurge REST call before re-provisioning, preventing the opaque 'Soft-deleted workspace exists' error on subsequent applies.",
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Real-Time IoT Anomaly Detection Pipeline',
      href: 'projects.html#kafka',
      id: 'portfolio:kafka',
      text: 'Detects equipment anomalies in real time from streaming sensor data, before they become costly failures.\nStack: Kafka, Spark Structured Streaming, Delta Lake, Python, Docker Compose\nCode: https://github.com/mohammed-taha-el-ahmar/iot-anomaly-pipeline',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Real-Time IoT Anomaly Detection Pipeline \u203A Design',
      href: 'projects.html#kafka',
      id: 'portfolio:kafka:design',
      text: 'Architecture: Sensor simulator \u2192 Kafka (partitioned by device) \u2192 Spark Structured Streaming \u2192 Delta Lake (bronze / silver / gold) \u2192 Alert dashboard\n- Kafka over a simpler queue \u2014 needed ordered delivery per device and the ability to replay historical streams for backtesting alert thresholds.\n- Structured Streaming over batch \u2014 sub-minute detection latency is the entire point; a 15-minute batch window would defeat the purpose.\n- Medallion architecture in Delta Lake \u2014 raw events preserved untouched in bronze for replay/debugging, cleaned in silver, aggregated alerts in gold.',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Self-Healing Daily Pipeline with Airflow',
      href: 'projects.html#airflow',
      id: 'portfolio:airflow',
      text: 'A daily ingestion pipeline that catches bad data before it reaches dashboards \u2014 and explains exactly what broke and why.\nStack: Apache Airflow, Python, Great Expectations, Postgres, Docker Compose\nCode: https://github.com/mohammed-taha-el-ahmar/self-healing-pipeline',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Self-Healing Daily Pipeline with Airflow \u203A Design',
      href: 'projects.html#airflow',
      id: 'portfolio:airflow:design',
      text: 'Architecture: Source API \u2192 Airflow DAG (extract \u2192 validate \u2192 load) \u2192 Data quality gate (pass \u2192 warehouse table / fail \u2192 quarantine + Slack alert)\n- Airflow over cron \u2014 needed dependency management, automatic retries with backoff, and the ability to backfill any historical date on demand.\n- Quarantine on failure, not fail-fast \u2014 bad batches are isolated for inspection rather than blocking the whole pipeline, so good data still flows.\n- Idempotent task design \u2014 every run for a given date can be safely re-executed without creating duplicates, which is what makes backfills safe.',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Agentic Root-Cause Investigator for the Self-Healing Pipeline',
      href: 'projects.html#airflow-rca-agent',
      id: 'portfolio:airflow-rca-agent',
      text: 'When bad data lands in quarantine, an LLM-powered agent investigates why \u2014 pulling its own evidence from logs, validation results, and schema diffs \u2014 and ships a structured incident report to Slack without a human opening a single tab.\nStack: Apache Airflow, Groq, Tool-Calling Agent, Great Expectations, Postgres, Slack\nCode: https://github.com/mohammed-taha-el-ahmar/self-healing-pipeline/airflow-rca-agent',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Agentic Root-Cause Investigator for the Self-Healing Pipeline \u203A Design',
      href: 'projects.html#airflow-rca-agent',
      id: 'portfolio:airflow-rca-agent:design',
      text: "Architecture: Quarantine event \u2192 Airflow task (trigger_rule=all_done) \u2192 pre-check: quarantine count == 0 \u2192 skip / > 0 \u2192 Groq tool-calling agent \u2192 evidence tools (quarantine table, GE results, Airflow logs, schema diff) \u2192 structured JSON verdict \u2192 Markdown report + Slack alert\n- Read-only tools, no auto-remediation \u2014 the agent diagnoses and reports; a human always owns the fix. Letting an LLM write to production tables without an approval gate is the kind of decision that's easy to regret.\n- Cheap pre-check before every LLM call \u2014 quarantine count is queried first so clean runs never spend an API call, keeping the demo cost-free at scale.",
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Agentic Root-Cause Investigator for the Self-Healing Pipeline \u203A Design',
      href: 'projects.html#airflow-rca-agent',
      id: 'portfolio:airflow-rca-agent:design-2',
      text: "- Hard iteration cap with a circuit breaker \u2014 the tool-calling loop raises InvestigationError rather than spinning indefinitely if the model can't converge, same discipline as any retriable production operation.",
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Analytics Engineering with dbt + Snowflake',
      href: 'projects.html#dbt',
      id: 'portfolio:dbt',
      text: 'Transforms raw operational data into trusted, tested business metrics \u2014 with full lineage so any number can be traced back to its source.\nStack: dbt, Snowflake, SQL, GitHub Actions\nCode: https://github.com/mohammed-taha-el-ahmar/analytics-engineering-dbt',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Analytics Engineering with dbt + Snowflake \u203A Design',
      href: 'projects.html#dbt',
      id: 'portfolio:dbt:design',
      text: 'Architecture: Raw source tables \u2192 Snowflake \u2192 dbt (staging \u2192 intermediate \u2192 marts) \u2192 tested, documented models \u2192 BI tool\n- Layered modeling (staging / intermediate / marts) \u2014 keeps raw-to-business-logic transformations traceable and each layer independently testable.\n- dbt tests as the contract \u2014 not_null, relationships, and custom business logic tests run on every build, so broken assumptions fail loudly, not silently in a dashboard.\n- Incremental models for high-volume tables \u2014 avoids full table rebuilds, keeping both cost and run time bounded as data grows.',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'NL-to-SQL Agent over dbt Marts',
      href: 'projects.html#dbt-nl-sql-agent',
      id: 'portfolio:dbt-nl-sql-agent',
      text: "Lets anyone query trusted dbt marts in plain English \u2014 the agent grounds itself in dbt's own schema metadata, validates every query before it touches a database, and self-corrects when it gets the SQL wrong.\nStack: dbt, Snowflake, DuckDB, Groq, FastAPI, Agentic AI\nCode: https://github.com/mohammed-taha-el-ahmar/analytics-engineering-dbt/dbt-nl-sql-agent",
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'NL-to-SQL Agent over dbt Marts \u203A Design',
      href: 'projects.html#dbt-nl-sql-agent',
      id: 'portfolio:dbt-nl-sql-agent:design',
      text: "Architecture: Plain-English question \u2192 Groq agent \u2192 SQL generated against dbt manifest schema \u2192 sqlglot guard (read-only, catalog-bound, row-limited) \u2192 DuckDB demo / Snowflake prod \u2192 self-correction on failure \u2192 result + attempt trail\n- Schema grounding from dbt's own manifest.json, not a hand-maintained file \u2014 the agent's vocabulary can never drift further from reality than the last `dbt docs generate`.\n- Read-only SQL guard via sqlglot \u2014 every candidate query is parsed and rejected unless it's a single SELECT against catalog-approved tables, before it ever reaches a database.",
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'NL-to-SQL Agent over dbt Marts \u203A Design',
      href: 'projects.html#dbt-nl-sql-agent',
      id: 'portfolio:dbt-nl-sql-agent:design-2',
      text: '- Bounded self-correction loop \u2014 failed validation or execution feeds the real error back to the model for up to 3 attempts, surfaced in the UI as an attempt trail rather than hidden behind the final answer.',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Serverless Data Lakehouse on AWS',
      href: 'projects.html#aws-data-pipeline',
      id: 'portfolio:aws-data-pipeline',
      text: 'Ingests a live API into a queryable S3 data lake \u2014 Glue handles schema and transformation, Redshift Spectrum queries the lake directly with no load step.\nStack: AWS, Lambda, Glue, Redshift Spectrum, S3, Terraform, Python, LocalStack\nCode: https://github.com/mohammed-taha-el-ahmar/aws-data-pipeline',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Serverless Data Lakehouse on AWS \u203A Design',
      href: 'projects.html#aws-data-pipeline',
      id: 'portfolio:aws-data-pipeline:design',
      text: "Architecture: API \u2192 Lambda (ingest) \u2192 S3 raw/ \u2192 Glue Crawler \u2192 Glue Catalog \u2192 Glue ETL (Spark) \u2192 S3 processed/ (Parquet) \u2192 Glue Crawler \u2192 Redshift Spectrum \u2192 API Gateway \u2192 Front\n- Right tool per stage \u2014 Lambda for cheap scheduled ingestion, Glue (Spark) for bulk transformation and schema management. Each service does what it's good at, not duplicating the other.\n- Glue Workflow for orchestration \u2014 crawl(raw) \u2192 transform \u2192 crawl(processed) chained with conditional triggers, so the pipeline is decoupled from Lambda and fully Glue-native.",
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Serverless Data Lakehouse on AWS \u203A Design',
      href: 'projects.html#aws-data-pipeline',
      id: 'portfolio:aws-data-pipeline:design-2',
      text: '- Redshift Spectrum over the Glue Catalog \u2014 the warehouse queries Parquet in S3 directly as external tables, avoiding a COPY/load step and any Glue\u2194Redshift networking, with IAM as the only integration surface.\n- Terraform for the whole stack \u2014 S3, Lambda, Glue (catalog + crawlers + job + workflow), Redshift Serverless and its Spectrum IAM role all provisioned and destroyed from one IaC tree, keeping cost bounded between demos.',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Clinical Trial Signal Detection (Real-Time Pharmacovigilance)',
      href: 'projects.html#clinical-trial-signal-detection',
      id: 'portfolio:clinical-trial-signal-detection',
      text: 'A real-time pharmacovigilance pipeline that monitors adverse event streams across clinical trial sites \u2014 Event Hub ingests reports, Stream Analytics applies tumbling-window detection in seconds, Synapse SQL Pool persists signals, and a FastAPI dashboard surfaces safety alerts live, cutting signal detection latency from days to minutes.\nStack: Azure, Event Hubs, Stream Analytics, Synapse Analytics, ADLS Gen2, FastAPI, Terraform, Pharmacovigilance, Real-Time, Python\nCode: https://github.com/mohammed-taha-el-ahmar/clinical-trial-signal-detection',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Clinical Trial Signal Detection (Real-Time Pharmacovigilance) \u203A Design',
      href: 'projects.html#clinical-trial-signal-detection',
      id: 'portfolio:clinical-trial-signal-detection:design',
      text: "Architecture: Trial Sites \u2192 Event Hub (adverse-events) \u2192 Stream Analytics (10-min tumbling window, GROUP BY + HAVING) \u2192 Event Hub (signal-alerts) + ADLS Gen2 (bronze/) \u2192 Synapse Dedicated SQL Pool \u2192 FastAPI + vanilla JS Dashboard\n- Tumbling windows over sliding \u2014 produces non-overlapping, auditable signal periods that map 1:1 to regulatory dossier timelines; simpler to reason about in ASA SQL which lacks nested analytic functions.\n- Count threshold in ASA, incidence rate downstream \u2014 ASA SQL doesn't support nested aggregates or analytic functions over GROUP BY; the heavy math (rate per arm population) is computed in the Synapse gold layer and local detector for full accuracy.",
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Clinical Trial Signal Detection (Real-Time Pharmacovigilance) \u203A Design',
      href: 'projects.html#clinical-trial-signal-detection',
      id: 'portfolio:clinical-trial-signal-detection:design-2',
      text: "- Single GROUP BY + HAVING pattern in ASA \u2014 CTE-to-CTE JOINs on the same stream fail in ASA, NEWID() is unsupported, and SUM(COUNT(*)) OVER(PARTITION BY) won't compile; a flat GROUP BY with CONCAT for synthetic IDs is the only reliable approach.\n- Synapse-first data loading with fixture fallback \u2014 API startup calls fetch_events() from Synapse; if data exists it serves real pipeline content, otherwise falls back to in-memory fixtures, enabling the same codebase to run locally at zero cost and in Azure with live data.",
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Clinical Trial Signal Detection (Real-Time Pharmacovigilance) \u203A Design',
      href: 'projects.html#clinical-trial-signal-detection',
      id: 'portfolio:clinical-trial-signal-detection:design-3',
      text: "- Dedicated SQL pool with no expression-based DEFAULTs \u2014 Synapse dedicated pools don't support DEFAULT GETUTCDATE() in DDL; columns use NULL and timestamps are set by the writer, which also avoids clock-skew issues between ASA and Synapse.\n- pyodbc import guard with graceful degradation \u2014 the Synapse client wraps pyodbc in try/except at module level (_PYODBC_AVAILABLE flag), so CI and local dev run fully in-memory without requiring ODBC driver installation.\n- Local detector mirrors ASA query \u2014 unit tests validate the same tumbling-window logic without an Azure dependency; 42 tests run in <1s with all Azure calls mocked via conftest monkeypatch of _SYNAPSE_AVAILABLE.",
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Event-Driven Pipeline on GCP',
      href: 'projects.html#gcp-data-pipeline',
      id: 'portfolio:gcp-data-pipeline',
      text: 'Streams live weather data through Cloud Functions into BigQuery \u2014 fully serverless, with Eventarc wiring so each stage triggers the next. A Cloud Run frontend displays the latest observation in real time.\nStack: GCP, Cloud Functions, BigQuery, Cloud Storage, Eventarc, Cloud Run, Terraform, Python, uv, Ruff, CI/CD, Docker\nCode: https://github.com/mohammed-taha-el-ahmar/gcp-data-pipeline',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Event-Driven Pipeline on GCP \u203A Design',
      href: 'projects.html#gcp-data-pipeline',
      id: 'portfolio:gcp-data-pipeline:design',
      text: 'Architecture: Open-Meteo API \u2192 Cloud Scheduler \u2192 Cloud Function (ingest) \u2192 Cloud Storage raw/ \u2192 Eventarc trigger \u2192 Cloud Function (transform) \u2192 BigQuery \u2192 Cloud Function (latest) \u2192 Cloud Run (frontend)\n- Cloud Functions Gen2 over Cloud Run for compute \u2014 the workload is small and bursty; Gen2 gives Eventarc integration and a 10-min timeout without container-management overhead.\n- Eventarc (object-finalize) for stage coupling \u2014 the transform function fires on new objects in GCS, so ingestion and transformation are decoupled; either can be replaced or retried independently.\n- BigQuery streaming inserts from the transform function \u2014 avoids a load job for single-row writes, keeping latency low while landing data in a warehouse with full SQL and BI tool support.',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Event-Driven Pipeline on GCP \u203A Design',
      href: 'projects.html#gcp-data-pipeline',
      id: 'portfolio:gcp-data-pipeline:design-2',
      text: '- Cloud Run for the frontend \u2014 serves a static nginx container with the dashboard; zero-to-scale, no infrastructure to manage, and the `latest` Cloud Function provides the JSON API behind it.\n- Terraform for the full stack \u2014 GCS buckets, Cloud Functions, BigQuery dataset + table, Cloud Scheduler, Eventarc triggers, Cloud Run, Artifact Registry, and IAM \u2014 all provisioned and destroyed from one configuration.\n- uv + ruff for developer tooling \u2014 fast dependency resolution with lockfile, consistent formatting and linting across local dev and CI, zero-config via pyproject.toml.\n- Shared module pattern \u2014 ingest and transform logic lives in shared/ and is reused unchanged across AWS, Azure, and GCP implementations; a packaging script bundles it into each function zip.',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'ADF-Orchestrated Pipeline on Azure',
      href: 'projects.html#azure-data-pipeline',
      id: 'portfolio:azure-data-pipeline',
      text: 'Uses Azure Data Factory as the orchestration backbone \u2014 an HTTP Copy Activity lands raw data in ADLS Gen2, an Event Grid-triggered Azure Function transforms it, and Azure SQL serves it via a live dashboard on Static Web Apps, showing the native Azure integration pattern most teams actually use.\nStack: Azure, Data Factory, ADLS Gen2, Azure Functions, Event Grid, Azure SQL, Static Web Apps, Terraform, Python\nCode: https://github.com/mohammed-taha-el-ahmar/azure-data-pipeline',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'ADF-Orchestrated Pipeline on Azure \u203A Design',
      href: 'projects.html#azure-data-pipeline',
      id: 'portfolio:azure-data-pipeline:design',
      text: "Architecture: API \u2192 ADF Pipeline (HTTP Copy Activity) \u2192 ADLS Gen2 raw/ \u2192 Event Grid \u2192 Azure Function (transform) \u2192 Azure SQL Database (serverless) \u2192 Static Web App Dashboard\n- Data Factory with HTTP connector \u2014 ADF's REST connector fails on gzip-encoded APIs like Open-Meteo, so the pipeline uses the HTTP connector (JsonSource + HttpReadSettings) which handles compression transparently.\n- ADLS Gen2 with hierarchical namespace \u2014 enables Synapse/Databricks compatibility, but requires Event Grid-based blob triggers instead of classic polling, which doesn't detect blobs on HNS-enabled accounts.\n- Event Grid system topic for blob trigger \u2014 wires BlobCreated events from the ADLS storage account to the Azure Function's webhook endpoint, replacing the unreliable polling trigger and enabling near-instant processing.",
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'ADF-Orchestrated Pipeline on Azure \u203A Design',
      href: 'projects.html#azure-data-pipeline',
      id: 'portfolio:azure-data-pipeline:design-2',
      text: '- Azure SQL serverless with auto-pause \u2014 the warehouse costs nothing when idle (auto-pauses after 60 min), making it demo-safe while still being a real relational engine with full T-SQL support.\n- Terraform for infrastructure, CLI for ADF wiring \u2014 linked services, datasets, and pipelines are created via `az datafactory` CLI commands (reproducible and scriptable), while the Event Grid topic is created separately and must be deleted before `terraform destroy`.\n- Auto-wrapping in the transform function \u2014 ADF writes the raw API response directly, but the shared transform logic expects the wrapped envelope format from ingest.py, so the function detects and wraps automatically for compatibility.',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'ADF-Orchestrated Pipeline on Azure \u203A Design',
      href: 'projects.html#azure-data-pipeline',
      id: 'portfolio:azure-data-pipeline:design-3',
      text: "- Remote build for function deployment \u2014 `--build remote` ensures pip installs run against Azure's Python 3.12, avoiding ModuleNotFound errors from local/remote version mismatches.",
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Airflow on Kubernetes \u2014 Orchestration Capstone',
      href: 'projects.html#k8s-airflow-data-platform',
      id: 'portfolio:k8s-airflow-data-platform',
      text: "Runs the same ingest + transform logic as the cloud-native projects, but you own the orchestration layer \u2014 showing when and why you'd choose a portable scheduler over vendor-specific triggers.\nStack: Kubernetes, Airflow, Helm, Docker, Python\nCode: https://github.com/mohammed-taha-el-ahmar/k8s-airflow-data-platform",
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Airflow on Kubernetes \u2014 Orchestration Capstone \u203A Design',
      href: 'projects.html#k8s-airflow-data-platform',
      id: 'portfolio:k8s-airflow-data-platform:design',
      text: 'Architecture: Airflow (Helm on K8s) \u2192 Task: ingest pod \u2192 object storage \u2192 Task: transform pod \u2192 warehouse\n- kind/minikube over managed K8s \u2014 demonstrates the same Airflow-on-Kubernetes pattern without EKS/GKE/AKS cost; the Helm chart and manifests are portable to any cluster.\n- Same shared/ module as the cloud repos \u2014 the ingest and transform logic is identical, making the architectural comparison honest: only the orchestration and deployment layer changes.\n- PythonOperator first, KubernetesPodOperator as an extension point \u2014 starts simple, with a clear upgrade path to per-task isolation in its own pod for heavier workloads.',
    },
    {
      doc: 'portfolio',
      label: 'Portfolio',
      title: 'Airflow on Kubernetes \u2014 Orchestration Capstone \u203A Design',
      href: 'projects.html#k8s-airflow-data-platform',
      id: 'portfolio:k8s-airflow-data-platform:design-2',
      text: '- Warehouse-agnostic by design \u2014 the DAG can load into local Postgres (via the docker/ stack), or any of the three cloud warehouses via credentials passed as Kubernetes secrets.',
    },
  ],
};

// src/text.js
var STOP = new Set(
  // English
  'a an the and or but if of to in on at by for with from as is are was were be been being it its this that these those he him his she her they them their we our you your i me my do does did done have has had can could would should will what which who whom whose when where why how about tell more please any some all there here than then so such into over also just very much many most other only own same too not no yes up out get got give us let know le la les un une des du de d l et ou mais si au aux en dans sur par pour avec sans sous est sont etait ete etre a ai as il elle ils elles on nous vous je j me m mon ma mes ton ta tes son sa ses leur leurs ce cet cette ces qui que qu quoi dont quel quelle quels quelles comment pourquoi quand combien ne pas plus tres bien aussi est-ce peut pouvez parlez dites moi sur-le fait faire avez a-t-il t y'.split(
    /\s+/,
  ),
);
var EXPAND = {
  salaire: ['salary', 'compensation'],
  remuneration: ['salary', 'compensation'],
  pretentions: ['salary', 'expectations'],
  tjm: ['rate', 'salary', 'consulting'],
  disponibilite: ['availability', 'available', 'notice'],
  disponible: ['availability', 'available'],
  preavis: ['notice', 'period'],
  teletravail: ['remote', 'hybrid'],
  distance: ['remote'],
  demenager: ['relocation'],
  demenagement: ['relocation'],
  mobilite: ['relocation'],
  contrat: ['contract'],
  cdi: ['contract', 'permanent', 'cdi'],
  freelance: ['consulting', 'missions', 'freelance'],
  independant: ['consulting', 'freelance'],
  competence: ['skills'],
  competences: ['skills'],
  experience: ['experience', 'years'],
  experiences: ['experience'],
  projet: ['project'],
  projets: ['project'],
  langue: ['languages'],
  langues: ['languages', 'english', 'french', 'arabic'],
  anglais: ['english'],
  francais: ['french'],
  arabe: ['arabic'],
  diplome: ['education', 'degree'],
  etudes: ['education'],
  formation: ['education', 'training'],
  ecole: ['education'],
  equipe: ['team', 'mentored', 'managed'],
  encadrement: ['mentored', 'managed', 'team'],
  manager: ['managed', 'team', 'mentored'],
  management: ['managed', 'team', 'mentored'],
  lead: ['managed', 'mentored', 'committees', 'training'],
  ia: ['ai', 'genai', 'llm'],
  genai: ['genai', 'llm', 'rag'],
  generative: ['genai', 'llm'],
  generatif: ['genai', 'llm'],
  llm: ['llm', 'genai', 'agent'],
  agent: ['agent', 'agents', 'multi-agent'],
  agents: ['agent', 'multi-agent'],
  donnees: ['data'],
  qualite: ['quality'],
  couts: ['cost'],
  cout: ['cost'],
  nuage: ['cloud'],
  certifie: ['certification', 'certified'],
  certifications: ['certification', 'certified', 'associate', 'professional'],
  stack: ['skills', 'core'],
  tech: ['skills', 'core'],
  technical: ['skills', 'core'],
  technologies: ['skills', 'core'],
  techno: ['skills', 'core'],
  technos: ['skills', 'core'],
  technique: ['skills', 'core'],
  outils: ['tools', 'skills'],
  secteur: ['industries'],
  secteurs: ['industries'],
  industrie: ['industries'],
  appel: ['call', 'book'],
  rendez: ['call', 'book'],
  rdv: ['call', 'book'],
  entretien: ['call', 'book'],
  call: ['call', 'book'],
  available: ['availability'],
  start: ['availability', 'notice'],
  wfh: ['remote'],
  pay: ['salary'],
  rate: ['salary', 'rate'],
  degree: ['education'],
  university: ['education'],
  streaming: ['streaming', 'kafka', 'kinesis', 'real-time'],
  'temps-reel': ['real-time', 'streaming'],
};
var REPLACE = /* @__PURE__ */ new Set(['stack', 'tech', 'technical', 'technologies', 'techno', 'technos', 'technique']);
function normalize(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
__name(normalize, 'normalize');
function stem(token) {
  if (token.length > 5 && token.endsWith('ies')) return token.slice(0, -3) + 'y';
  if (token.length > 4 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}
__name(stem, 'stem');
function tokenize(text) {
  return normalize(text)
    .split(/[^a-z0-9+#]+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map(stem);
}
__name(tokenize, 'tokenize');
function queryTokens(text) {
  const raw = normalize(text)
    .split(/[^a-z0-9+#-]+/)
    .filter(Boolean);
  const out = [];
  for (const t of raw) {
    if (EXPAND[t]) out.push(...EXPAND[t].map((e) => stem(e)));
    if (REPLACE.has(t)) continue;
    for (const part of t.split('-')) {
      if (part.length > 1 && !STOP.has(part)) out.push(stem(part));
    }
  }
  return out;
}
__name(queryTokens, 'queryTokens');
var estimateTokens = /* @__PURE__ */ __name((text) => Math.ceil((text ?? '').length / 4), 'estimateTokens');

// src/embeddings.js
var MODEL = '@cf/baai/bge-m3';
var chunkVectors = null;
var cosine = /* @__PURE__ */ __name((a, b) => {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}, 'cosine');
async function embed(env, texts) {
  const out = [];
  for (let i = 0; i < texts.length; i += 50) {
    const res = await env.AI.run(MODEL, { text: texts.slice(i, i + 50) });
    out.push(...res.data);
  }
  return out;
}
__name(embed, 'embed');
async function semanticScores(query, chunks, env) {
  if (!env?.AI) return null;
  try {
    if (!chunkVectors) {
      const vecs = await embed(
        env,
        chunks.map(
          (c) => `${c.title}
${c.text}`,
        ),
      );
      chunkVectors = chunks.map((chunk, i) => ({ chunk, vec: vecs[i] }));
    }
    const [q] = await embed(env, [query]);
    return chunkVectors.map(({ chunk, vec }) => ({ chunk, score: cosine(q, vec) })).sort((a, b) => b.score - a.score);
  } catch (err) {
    console.warn('Embeddings unavailable, using lexical retrieval only:', err?.message ?? err);
    return null;
  }
}
__name(semanticScores, 'semanticScores');

// src/retrieval.js
var K1 = 1.2;
var B = 0.75;
var TITLE_BOOST = 2;
var INDEX = null;
function buildIndex(chunks) {
  const docs = chunks.map((c) => {
    const titleTokens = tokenize(c.title);
    const tokens = [...tokenize(c.text), ...Array.from({ length: TITLE_BOOST }, () => titleTokens).flat()];
    const tf = /* @__PURE__ */ new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { chunk: c, tf, len: tokens.length };
  });
  const df = /* @__PURE__ */ new Map();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const avgLen = docs.reduce((n, d) => n + d.len, 0) / docs.length;
  return { docs, df, avgLen, N: docs.length };
}
__name(buildIndex, 'buildIndex');
function getIndex() {
  INDEX ??= buildIndex(kb_default.chunks);
  return INDEX;
}
__name(getIndex, 'getIndex');
function bm25(query, index = getIndex()) {
  const terms = [...new Set(queryTokens(query))];
  const results = [];
  for (const d of index.docs) {
    let score = 0;
    for (const t of terms) {
      const f = d.tf.get(t);
      if (!f) continue;
      const n = index.df.get(t);
      const idf = Math.log(1 + (index.N - n + 0.5) / (n + 0.5));
      score += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.len) / index.avgLen)));
    }
    if (score > 0) results.push({ chunk: d.chunk, score });
  }
  return results.sort((a, b) => b.score - a.score);
}
__name(bm25, 'bm25');
function fuse(lists, k = 60) {
  const scores = /* @__PURE__ */ new Map();
  for (const list of lists) {
    list.forEach((item, rank) => {
      const prev = scores.get(item.chunk.id) ?? { chunk: item.chunk, score: 0 };
      prev.score += 1 / (k + rank + 1);
      scores.set(item.chunk.id, prev);
    });
  }
  return [...scores.values()].sort((a, b) => b.score - a.score);
}
__name(fuse, 'fuse');
async function retrieve(query, { budget = 1800, env = {}, minRelative = 0.3 } = {}) {
  const index = getIndex();
  let ranked = bm25(query, index);
  if (ranked.length) {
    const top = ranked[0].score;
    ranked = ranked.filter((r) => r.score >= top * minRelative);
  }
  const semantic = await semanticScores(
    query,
    index.docs.map((d) => d.chunk),
    env,
  );
  if (semantic) ranked = fuse([ranked, semantic.slice(0, 15)]);
  const pinned = index.docs.map((d) => d.chunk).filter((c) => c.pinned);
  const picked = [];
  let used = 0;
  const add = /* @__PURE__ */ __name((chunk) => {
    if (picked.some((c) => c.id === chunk.id)) return;
    const cost = estimateTokens(chunk.title) + estimateTokens(chunk.text) + 6;
    if (used + cost > budget) return;
    picked.push(chunk);
    used += cost;
  }, 'add');
  pinned.forEach(add);
  for (const r of ranked) add(r.chunk);
  return { chunks: picked, tokens: used, matched: ranked.length };
}
__name(retrieve, 'retrieve');
function formatContext(chunks) {
  return chunks
    .map(
      (c, i) => `[${i + 1}] ${c.label} \u2014 ${c.title}
${c.text}`,
    )
    .join('\n\n');
}
__name(formatContext, 'formatContext');

// src/history.js
var ASSISTANT_KEEP_CHARS = 600;
function prepareMessages(messages, budget) {
  const clean = (Array.isArray(messages) ? messages : [])
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.trim() }));
  const lastUserIdx = clean.map((m) => m.role).lastIndexOf('user');
  if (lastUserIdx === -1) return { history: [], question: '' };
  const question = clean[lastUserIdx].content.slice(0, DEFAULTS.MAX_QUESTION_CHARS);
  const earlier = clean.slice(0, lastUserIdx).map((m) => ({
    role: m.role,
    content:
      m.role === 'assistant' && m.content.length > ASSISTANT_KEEP_CHARS
        ? `${m.content.slice(0, ASSISTANT_KEEP_CHARS)}\u2026`
        : m.content.slice(0, DEFAULTS.MAX_QUESTION_CHARS),
  }));
  const history = [];
  let used = 0;
  for (let i = earlier.length - 1; i >= 0; i--) {
    const cost = estimateTokens(earlier[i].content) + 4;
    if (used + cost > budget) break;
    history.unshift(earlier[i]);
    used += cost;
  }
  while (history.length && history[0].role !== 'user') history.shift();
  return { history, question };
}
__name(prepareMessages, 'prepareMessages');
function retrievalQuery(question, history) {
  const prevUser = [...history].reverse().find((m) => m.role === 'user')?.content ?? '';
  const isFollowUp =
    question.split(/\s+/).length < 8 || /\b(it|that|this|those|them|more|ça|cela|ce projet|plus)\b/i.test(question);
  return isFollowUp && prevUser
    ? `${question}
${prevUser}`
    : question;
}
__name(retrievalQuery, 'retrievalQuery');

// src/prompt.js
var LANG_NAME = { en: 'English', fr: 'French' };
function rules(calLink, lang) {
  return [
    'You are the AI assistant on the personal website of Mohammed Taha EL AHMAR, a Senior Cloud Data Engineer in Paris. You answer recruiters on his behalf, in the third person, warmly and concisely.',
    'Use ONLY facts from CONTEXT. Never invent employers, numbers, dates, skills or opinions. If the answer is not in CONTEXT, say so briefly and suggest a call.',
    `Reply in the language of the user's latest message (default: ${LANG_NAME[lang] ?? 'English'}).`,
    'Format: short paragraphs, "- " bullets when listing, **bold** sparingly. No headings, no tables, no citation numbers.',
    `When helpful (availability, salary, next steps), invite them to book a 30-minute call: ${calLink}`,
  ].join('\n');
}
__name(rules, 'rules');
function chatSystemPrompt({ calLink, lang, chunks }) {
  return `${rules(calLink, lang)}

For questions starting with "Tell me more about this:" (a resume line), explain the likely challenge, his approach and the impact in 3\u20135 concrete sentences, using CONTEXT.
Keep answers under 180 words.

CONTEXT:
${formatContext(chunks)}`;
}
__name(chatSystemPrompt, 'chatSystemPrompt');
function jdSystemPrompt({ calLink, lang, chunks }) {
  return `${rules(calLink, lang)}

The user pasted a job description. Assess how well his background fits it, honestly. Answer in exactly this structure:
**Overall fit:** one sentence (strong / good / partial) with the main reason.
**Strong matches:** 3\u20135 bullets "requirement \u2192 evidence from CONTEXT".
**Gaps or to discuss:** 1\u20133 bullets for requirements CONTEXT does not show (say "not covered in his profile", never guess).
**Most relevant projects:** 1\u20133 bullets naming projects from CONTEXT.
End with one line inviting them to book a call. Max 230 words.

CONTEXT:
${formatContext(chunks)}`;
}
__name(jdSystemPrompt, 'jdSystemPrompt');

// src/llm.js
var UpstreamError = class extends Error {
  static {
    __name(this, 'UpstreamError');
  }
  constructor(status, detail, model) {
    super(`Groq API error ${status} (${model})`);
    this.status = status;
    this.detail = detail;
    this.model = model;
  }
};
function modelParams(model) {
  if (model.startsWith('openai/gpt-oss')) return { reasoning_effort: 'low', include_reasoning: false };
  if (model.startsWith('qwen/')) return { reasoning_effort: 'none' };
  return {};
}
__name(modelParams, 'modelParams');
var RETRYABLE = /* @__PURE__ */ new Set([400, 404, 413, 429, 498, 500, 502, 503]);
async function chatCompletion({ apiKey, models, messages, maxTokens, stream = false, fetchImpl = fetch }) {
  let lastError;
  for (const model of models) {
    const body = { model, messages, max_completion_tokens: maxTokens, temperature: 0.3, stream, ...modelParams(model) };
    let res;
    try {
      res = await fetchImpl(DEFAULTS.GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(DEFAULTS.GROQ_TIMEOUT_MS),
      });
    } catch (err) {
      lastError = new UpstreamError(504, String(err?.message ?? err), model);
      continue;
    }
    if (res.ok) return { res, model };
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    lastError = new UpstreamError(res.status, detail, model);
    console.warn(`Model ${model} failed (${res.status}): ${detail}`);
    if (!RETRYABLE.has(res.status)) break;
  }
  throw lastError;
}
__name(chatCompletion, 'chatCompletion');
function stripThinking(text) {
  return text.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trimStart();
}
__name(stripThinking, 'stripThinking');
async function* streamDeltas(res) {
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let inThink = false;
  let pending = '';
  const filter = /* @__PURE__ */ __name((text) => {
    pending += text;
    let out = '';
    for (;;) {
      if (inThink) {
        const end = pending.indexOf('</think>');
        if (end === -1) {
          pending = pending.slice(-8);
          return out;
        }
        pending = pending.slice(end + 8);
        inThink = false;
      } else {
        const start = pending.indexOf('<think>');
        if (start === -1) {
          const keep = pending.lastIndexOf('<') > pending.length - 7 ? pending.lastIndexOf('<') : -1;
          const safe = keep === -1 ? pending : pending.slice(0, keep);
          out += safe;
          pending = pending.slice(safe.length);
          return out;
        }
        out += pending.slice(0, start);
        pending = pending.slice(start + 7);
        inThink = true;
      }
    }
  }, 'filter');
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let nl;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') continue;
      let json2;
      try {
        json2 = JSON.parse(data);
      } catch {
        continue;
      }
      if (json2.error)
        throw new UpstreamError(json2.error.status ?? 502, json2.error.message ?? 'stream error', 'stream');
      const delta = json2.choices?.[0]?.delta?.content;
      if (delta) {
        const text = filter(delta);
        if (text) yield { text };
      }
      const finish = json2.choices?.[0]?.finish_reason;
      if (finish) yield { finish };
      const usage = json2.x_groq?.usage ?? json2.usage;
      if (usage) yield { usage };
    }
  }
  if (pending && !inThink) yield { text: pending };
}
__name(streamDeltas, 'streamDeltas');
function continuationMessages(messages, partial) {
  return [
    ...messages,
    { role: 'assistant', content: partial },
    {
      role: 'user',
      content:
        'Your previous answer was cut off. Continue it exactly where it stopped, without repeating anything and without any preamble. Finish within 80 words.',
    },
  ];
}
__name(continuationMessages, 'continuationMessages');
var reasoningTokens = /* @__PURE__ */ __name(
  (usage) => usage?.completion_tokens_details?.reasoning_tokens,
  'reasoningTokens',
);

// src/suggestions.js
var T = {
  en: {
    portfolio: /* @__PURE__ */ __name((t) => `What were the key design decisions in "${t}"?`, 'portfolio'),
    resume: /* @__PURE__ */ __name((t) => `What were his main achievements in ${t}?`, 'resume'),
    remote: 'Is he open to remote work?',
    notice: 'When could he start?',
    certs: 'Which certifications does he hold?',
    genai: "What's his hands-on experience with GenAI?",
    projects: 'Which portfolio project best shows his streaming skills?',
  },
  fr: {
    portfolio: /* @__PURE__ */ __name(
      (t) => `Quelles ont \xE9t\xE9 les d\xE9cisions techniques cl\xE9s de \xAB ${t} \xBB ?`,
      'portfolio',
    ),
    resume: /* @__PURE__ */ __name((t) => `Quelles ont \xE9t\xE9 ses principales r\xE9alisations (${t}) ?`, 'resume'),
    remote: 'Est-il ouvert au t\xE9l\xE9travail ?',
    notice: 'Quand pourrait-il commencer ?',
    certs: 'Quelles certifications poss\xE8de-t-il ?',
    genai: 'Quelle est son exp\xE9rience concr\xE8te en IA g\xE9n\xE9rative ?',
    projects: 'Quel projet illustre le mieux ses comp\xE9tences en streaming ?',
  },
};
var shortTitle = /* @__PURE__ */ __name(
  (title) =>
    title
      .split(' \u203A ')[0]
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/\s+—.*$/, '')
      .trim(),
  'shortTitle',
);
function followUps({ chunks, question, history, lang = 'en' }) {
  const t = T[lang] ?? T.en;
  const asked = new Set(
    [question, ...history.filter((m) => m.role === 'user').map((m) => m.content)].map((q) => q.toLowerCase()),
  );
  const out = [];
  const push = /* @__PURE__ */ __name((s) => {
    if (s && !asked.has(s.toLowerCase()) && !out.includes(s)) out.push(s);
  }, 'push');
  for (const c of chunks.filter((x) => !x.pinned).slice(0, 2)) {
    if (c.doc === 'portfolio') push(t.portfolio(shortTitle(c.title)));
    else if (c.doc === 'resume' && c.title.includes('\u203A'))
      push(t.resume(shortTitle(c.title.split(' \u203A ').pop())));
    if (out.length >= 2) break;
  }
  for (const generic of [t.genai, t.remote, t.notice, t.certs, t.projects]) {
    if (out.length >= 3) break;
    push(generic);
  }
  return out.slice(0, 3);
}
__name(followUps, 'followUps');

// src/sse.js
function sseStream() {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  let closed = false;
  return {
    readable,
    send(event, data) {
      if (closed) return Promise.resolve();
      return writer.write(
        enc.encode(`event: ${event}
data: ${JSON.stringify(data)}

`),
      );
    },
    close() {
      if (closed) return Promise.resolve();
      closed = true;
      return writer.close();
    },
  };
}
__name(sseStream, 'sseStream');

// src/analytics.js
function logEvent(env, event) {
  try {
    if (env?.ANALYTICS?.writeDataPoint) {
      env.ANALYTICS.writeDataPoint({
        indexes: [event.type],
        blobs: [
          event.type,
          event.mode ?? '',
          event.lang ?? '',
          event.model ?? '',
          event.chunks ?? '',
          event.rating ?? '',
          (event.question ?? '').slice(0, 200),
          event.status ?? '',
          event.finish ?? '',
        ],
        doubles: [event.ms ?? 0, event.promptTokens ?? 0, event.completionTokens ?? 0, event.contextTokens ?? 0],
      });
    } else {
      console.log(JSON.stringify({ ...event, question: event.question?.slice(0, 200) }));
    }
  } catch (err) {
    console.warn('analytics failed', err);
  }
}
__name(logEvent, 'logEvent');

// src/index.js
function joinParts(a, b) {
  if (!a || !b) return a + b;
  if (/\s$/.test(a) || /^[\s.,;:!?)]/.test(b)) return a + b;
  return `${a} ${b}`;
}
__name(joinParts, 'joinParts');
var sourcesOf = /* @__PURE__ */ __name((chunks) => {
  const seen = /* @__PURE__ */ new Map();
  for (const c of chunks) {
    if (c.pinned) continue;
    const title = c.title.replace(/ › Design$/, '');
    const key = c.href ?? `${c.doc}:${title}`;
    if (!seen.has(key)) {
      seen.set(key, {
        label: c.label,
        title: title
          .split(' \u203A ')
          .pop()
          .replace(/^Context:\s*/i, ''),
        href: c.href ?? null,
      });
    }
  }
  return [...seen.values()].slice(0, 3);
}, 'sourcesOf');
function friendly(err, lang) {
  const busy = err instanceof UpstreamError && err.status === 429;
  if (lang === 'fr') {
    return busy
      ? "L'assistant est tr\xE8s sollicit\xE9 en ce moment. R\xE9essayez dans une minute."
      : "L'assistant est momentan\xE9ment indisponible. R\xE9essayez dans un instant.";
  }
  return busy
    ? 'The assistant is busy right now. Please try again in a minute.'
    : 'The assistant is temporarily unavailable. Please try again shortly.';
}
__name(friendly, 'friendly');
async function handleChat(request, env, cfg, cors, fetchImpl) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorJson('Invalid JSON body.', 400, cors);
  }
  const started = Date.now();
  const lang = body?.lang === 'fr' ? 'fr' : 'en';
  const mode = body?.mode === 'jd' ? 'jd' : 'chat';
  const wantStream = body?.stream === true;
  let question;
  let history;
  if (mode === 'jd') {
    const jd = typeof body.jd === 'string' ? body.jd.trim().slice(0, DEFAULTS.MAX_JD_CHARS) : '';
    if (jd.length < 40) return errorJson('Please paste a job description (at least a few lines).', 400, cors);
    question = jd;
    history = [];
  } else {
    ({ question, history } = prepareMessages(body?.messages, cfg.historyTokens));
    if (!question) return errorJson('messages array with a user message is required.', 400, cors);
  }
  const query = mode === 'jd' ? question : retrievalQuery(question, history);
  const { chunks, tokens: contextTokens } = await retrieve(query, { budget: cfg.contextTokens, env });
  const promptArgs = { calLink: cfg.calLink, lang, chunks };
  const messages = [
    { role: 'system', content: mode === 'jd' ? jdSystemPrompt(promptArgs) : chatSystemPrompt(promptArgs) },
    ...history,
    {
      role: 'user',
      content:
        mode === 'jd'
          ? `Job description:
${question}`
          : question,
    },
  ];
  const meta = {
    sources: sourcesOf(chunks),
    suggestions: mode === 'jd' ? [] : followUps({ chunks, question, history, lang }),
  };
  const log = /* @__PURE__ */ __name(
    (extra) =>
      logEvent(env, {
        type: 'chat',
        mode,
        lang,
        chunks: chunks.map((c) => c.id).join(','),
        contextTokens,
        question: mode === 'jd' ? '[job description]' : question,
        ms: Date.now() - started,
        ...extra,
      }),
    'log',
  );
  if (!wantStream) {
    try {
      let { res, model } = await chatCompletion({
        apiKey: env.GROQ_API_KEY,
        models: cfg.models,
        messages,
        maxTokens: cfg.maxCompletionTokens,
        fetchImpl,
      });
      let data = await res.json();
      let text = stripThinking(data.choices?.[0]?.message?.content ?? '');
      let finish = data.choices?.[0]?.finish_reason;
      const usage = { ...data.usage };
      let continuations = 0;
      while (finish === 'length' && continuations < DEFAULTS.MAX_CONTINUATIONS) {
        continuations++;
        ({ res, model } = await chatCompletion({
          apiKey: env.GROQ_API_KEY,
          models: [model, ...cfg.models.filter((m) => m !== model)],
          messages: continuationMessages(messages, text),
          maxTokens: cfg.maxCompletionTokens,
          fetchImpl,
        }));
        data = await res.json();
        text = joinParts(text, stripThinking(data.choices?.[0]?.message?.content ?? ''));
        finish = data.choices?.[0]?.finish_reason;
        usage.completion_tokens = (usage.completion_tokens ?? 0) + (data.usage?.completion_tokens ?? 0);
      }
      if (finish === 'length') text = `${text.trimEnd()}\u2026`;
      log({
        model,
        status: finish === 'length' ? 'truncated' : 'ok',
        finish,
        continuations,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        reasoningTokens: reasoningTokens(data.usage),
      });
      return json({ content: [{ type: 'text', text }], ...meta, model, truncated: finish === 'length' }, 200, cors);
    } catch (err) {
      log({ status: `error:${err.status ?? 'unknown'}` });
      console.error('chat failed', err);
      return errorJson(friendly(err, lang), err?.status === 429 ? 429 : 502, cors);
    }
  }
  let upstream;
  try {
    upstream = await chatCompletion({
      apiKey: env.GROQ_API_KEY,
      models: cfg.models,
      messages,
      maxTokens: cfg.maxCompletionTokens,
      stream: true,
      fetchImpl,
    });
  } catch (err) {
    log({ status: `error:${err.status ?? 'unknown'}` });
    console.error('chat failed', err);
    return errorJson(friendly(err, lang), err?.status === 429 ? 429 : 502, cors);
  }
  const sse = sseStream();
  const pump = (async () => {
    let usage;
    let text = '';
    let finish;
    let continuations = 0;
    let current = upstream;
    let joinNext = false;
    try {
      await sse.send('meta', { ...meta, model: upstream.model });
      for (;;) {
        finish = void 0;
        for await (const part of streamDeltas(current.res)) {
          if (part.text) {
            const piece = joinNext ? joinParts(text, part.text).slice(text.length) : part.text;
            joinNext = false;
            text += piece;
            await sse.send('delta', { t: piece });
          }
          if (part.finish) finish = part.finish;
          if (part.usage) usage = part.usage;
        }
        if (finish !== 'length' || continuations >= DEFAULTS.MAX_CONTINUATIONS || !text) break;
        continuations++;
        current = await chatCompletion({
          apiKey: env.GROQ_API_KEY,
          models: [current.model, ...cfg.models.filter((m) => m !== current.model)],
          messages: continuationMessages(messages, text),
          maxTokens: cfg.maxCompletionTokens,
          stream: true,
          fetchImpl,
        });
        joinNext = true;
      }
      if (!text) await sse.send('error', { message: friendly(null, lang) });
      if (finish === 'length' && text) await sse.send('delta', { t: '\u2026' });
      await sse.send('done', { truncated: finish === 'length' });
      log({
        model: current.model,
        status: !text ? 'empty' : finish === 'length' ? 'truncated' : 'ok',
        finish,
        continuations,
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        reasoningTokens: reasoningTokens(usage),
      });
    } catch (err) {
      console.error('stream failed', err);
      await sse.send('error', { message: friendly(err, lang) });
      log({ model: current.model, status: `error:stream:${err.status ?? 'unknown'}`, continuations });
    } finally {
      await sse.close();
    }
  })();
  return {
    response: new Response(sse.readable, {
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', ...cors },
    }),
    pending: pump,
  };
}
__name(handleChat, 'handleChat');
async function handleFeedback(request, env, cors) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorJson('Invalid JSON body.', 400, cors);
  }
  const rating = body?.rating === 'up' || body?.rating === 'down' ? body.rating : null;
  if (!rating) return errorJson('rating must be "up" or "down".', 400, cors);
  logEvent(env, {
    type: 'feedback',
    rating,
    question: typeof body.question === 'string' ? body.question : '',
    chunks: typeof body.id === 'string' ? body.id.slice(0, 64) : '',
  });
  return new Response(null, { status: 204, headers: cors });
}
__name(handleFeedback, 'handleFeedback');
async function handleRequest(
  request,
  env,
  { fetchImpl = fetch, waitUntil = /* @__PURE__ */ __name(() => {}, 'waitUntil') } = {},
) {
  const cfg = settings(env);
  const origin = request.headers.get('Origin') ?? '';
  const url = new URL(request.url);
  const cors = corsHeaders(origin, cfg.allowedOrigins);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (origin && !cfg.allowedOrigins.includes(origin)) return new Response('Forbidden', { status: 403 });
  if (request.method !== 'POST' || !['/chat', '/feedback'].includes(url.pathname)) {
    return new Response('Not found', { status: 404 });
  }
  if (url.pathname === '/feedback') return handleFeedback(request, env, cors);
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (isRateLimited(ip)) {
    return errorJson('Rate limit exceeded. Please wait before sending more messages.', 429, cors);
  }
  const result = await handleChat(request, env, cfg, cors, fetchImpl);
  if (result instanceof Response) return result;
  waitUntil(result.pending);
  return result.response;
}
__name(handleRequest, 'handleRequest');
var index_default = {
  fetch: /* @__PURE__ */ __name(
    (request, env, ctx) =>
      handleRequest(request, env, { waitUntil: /* @__PURE__ */ __name((p) => ctx.waitUntil(p), 'waitUntil') }),
    'fetch',
  ),
};
export { index_default as default, handleRequest };
//# sourceMappingURL=index.js.map
