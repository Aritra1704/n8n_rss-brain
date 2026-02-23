# rss-brain

## Project Banner
```text
╔══════════════════════════════════════════════════════╗
║                      rss-brain                       ║
║          AI-Powered RSS News Digest System           ║
╚══════════════════════════════════════════════════════╝
```

## What is rss-brain?
`rss-brain` is an AI-powered automation project that collects articles from RSS feeds, summarizes them with OpenAI, and stores digest data in PostgreSQL.  
It is built around `n8n` workflows and runs locally with Docker and Docker Compose, with deployment support planned for Railway.  
The project also includes a simple dashboard UI to view digests and basic workflow status.

## Architecture Overview
```text
RSS Feeds
   |
   v
n8n Workflow (trigger + fetch + process)
   |
   v
OpenAI API (summarization)
   |
   v
PostgreSQL (store digests + metadata)
   |
   v
Dashboard UI (HTML/CSS/JS)
```

## Tech Stack
| Technology | Role in Project |
| --- | --- |
| n8n | Workflow orchestration and automation logic |
| OpenAI API | AI summarization of fetched RSS content |
| PostgreSQL | Persistent storage for digests and workflow metadata |
| Docker | Containerized local runtime |
| Docker Compose | Multi-service orchestration for local development |
| Node.js | Tooling/runtime support for scripts and UI development |
| Vanilla JavaScript | Lightweight dashboard logic in the browser |

## Project Folder Structure
```text
rss-brain/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── workflows/
│   └── rss-digest.json          # n8n workflow export
├── database/
│   └── init.sql                 # PostgreSQL schema
├── scripts/
│   └── export-workflow.sh       # helper to export n8n workflow
├── ui/
│   ├── public/
│   │   └── index.html           # Dashboard
│   └── src/
│       ├── app.js               # Dashboard logic
│       └── style.css            # Dashboard styles
└── docs/
    └── architecture.md          # Deep dive architecture notes
```

## Prerequisites
- Docker and Docker Compose installed
- OpenAI API key
- PostgreSQL credentials (if using external DB; otherwise use the Docker service)

## Quick Start
1. Clone and enter the project.
   ```bash
   git clone <your-repo-url>
   cd rss-brain
   ```
2. Create environment configuration.
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and set values such as `OPENAI_API_KEY` and PostgreSQL credentials.
4. Start all services.
   ```bash
   docker compose up -d
   ```
5. (Optional) Initialize the database schema manually.
   ```bash
   docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < database/init.sql
   ```
6. Access local services.
   ```bash
   # n8n (default)
   http://localhost:5678
   # Dashboard UI (configure the mapped port in docker-compose.yml)
   http://localhost:3000
   ```

## How It Works
1. `n8n` runs on a schedule (or webhook/manual trigger) to start the digest workflow.
2. The workflow fetches the latest articles from configured RSS feeds.
3. Article content and metadata are cleaned and prepared for summarization.
4. OpenAI generates concise summaries and optional tags/highlights.
5. Results are saved in PostgreSQL for persistence and later retrieval.
6. The dashboard reads stored digests and shows them in a simple UI.

## Environment Variables
Use `.env.example` as the source of truth, then copy values into `.env`.

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | Yes | `sk-...` | API key used for AI summarization |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Model used by summary step |
| `POSTGRES_HOST` | Yes | `postgres` | PostgreSQL host/service name |
| `POSTGRES_PORT` | Yes | `5432` | PostgreSQL port |
| `POSTGRES_DB` | Yes | `rss_brain` | Database name |
| `POSTGRES_USER` | Yes | `rss_user` | Database user |
| `POSTGRES_PASSWORD` | Yes | `change-me` | Database password |
| `N8N_HOST` | No | `localhost` | n8n host binding |
| `N8N_PORT` | No | `5678` | n8n web UI/API port |
| `N8N_BASIC_AUTH_USER` | No | `admin` | n8n basic auth username |
| `N8N_BASIC_AUTH_PASSWORD` | No | `strong-password` | n8n basic auth password |
| `DIGEST_CRON` | No | `0 */6 * * *` | Schedule for digest generation |

## Deployment
### Railway (Placeholder)
Railway deployment support is planned.  
This section will later include:
- Service provisioning steps
- Environment variable mapping
- Persistent PostgreSQL setup
- Deployment verification checklist

## Learning Goals
- Understand `n8n` workflow architecture and node-to-node data flow
- Practice integrating AI summarization into automation pipelines
- Learn service orchestration with Docker and Docker Compose
- Work with PostgreSQL schema design for digest-style data
- Build a minimal UI that consumes workflow outputs

## License
This project is licensed under the MIT License.
