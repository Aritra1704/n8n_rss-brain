# rss-brain Commands Cheat Sheet

This file contains practical commands for running and maintaining the `rss-brain` project locally.

## 1. Docker - Daily Commands

```bash
# Start all services in detached mode for normal daily development.
docker compose up -d

# Stop all running services without removing containers or volumes.
docker compose stop

# Restart all services after environment/config updates.
docker compose restart

# Stop and remove containers, networks, and named volumes (full local reset).
docker compose down -v
```

## 2. Docker - Logs & Debugging

```bash
# Show current status of all compose services (running, exited, healthy).
docker compose ps

# Show combined logs from all services once (no follow mode).
docker compose logs

# Follow live logs from all services to watch startup/runtime behavior.
docker compose logs -f

# Follow only n8n logs when debugging workflow execution or auth issues.
docker compose logs -f n8n

# Follow only PostgreSQL logs when debugging DB startup/connection problems.
docker compose logs -f postgres

# Follow only UI logs when debugging dashboard serving/static file issues.
docker compose logs -f ui

# Show the last 100 log lines for all services to quickly inspect recent errors.
docker compose logs --tail=100
```

## 3. Docker - Database Access

```bash
# Open an interactive shell inside the postgres container for deeper debugging.
docker compose exec postgres sh

# Open an interactive psql session against the configured rss-brain database.
docker compose exec postgres psql -U "$DB_POSTGRESDB_USER" -d "$DB_POSTGRESDB_DATABASE"

# Run a quick SQL health check and exit (useful in scripts/CI checks).
docker compose exec -T postgres psql -U "$DB_POSTGRESDB_USER" -d "$DB_POSTGRESDB_DATABASE" -c "SELECT NOW();"

# Re-run the local schema file manually against the database when needed.
docker compose exec -T postgres psql -U "$DB_POSTGRESDB_USER" -d "$DB_POSTGRESDB_DATABASE" < database/init.sql
```

## 4. n8n - Workflow Import/Export via CLI

```bash
# Export all n8n workflows from the container into the mounted workflows folder.
docker compose exec n8n n8n export:workflow --all --output=/home/node/workflows/rss-digest.json

# Import workflows from the mounted workflows folder into n8n.
docker compose exec n8n n8n import:workflow --input=/home/node/workflows/rss-digest.json

# List n8n CLI help for workflow commands when flags/options are unclear.
docker compose exec n8n n8n help
```

## 5. Git - Common Workflow Commits For This Project

```bash
# Check changed files before staging to confirm what will be committed.
git status

# Stage all tracked/untracked changes in this repository.
git add .

# Create a commit with a clear message describing the current change set.
git commit -m "feat: update rss-brain docker and dashboard setup"

# Review recent commit history to verify commit order and messages.
git log --oneline -n 10

# Push current branch changes to origin for backup and collaboration.
git push
```

## 6. Railway - Deployment Commands (Placeholder)

```bash
# Log in to Railway CLI before linking or deploying this project.
railway login

# Link local repository to an existing Railway project.
railway link

# Deploy current project state to Railway from your local branch.
railway up

# View Railway service logs to debug deployment/runtime issues.
railway logs
```
