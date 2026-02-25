// ui/api.js — lightweight Express API for RSS Brain dashboard
// Run alongside nginx or replace nginx with this server entirely
// Usage: node api.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const PUBLIC_DIR = path.join(__dirname, 'public');

function json(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  // ── API routes ──────────────────────────────────────────────────────────────
  if (url === '/api/articles') {
    try {
      const result = await pool.query(`
        SELECT 
          a.id, a.title, a.url, a.published_at,
          s.name as source_name,
          sm.summary, sm.key_points, sm.sentiment, sm.relevance_score, sm.tags
        FROM rss_brain.rss_articles a
        LEFT JOIN rss_brain.rss_sources s ON a.source_id = s.id
        LEFT JOIN rss_brain.article_summaries sm ON sm.article_id = a.id
        WHERE sm.summary IS NOT NULL
        ORDER BY a.published_at DESC
        LIMIT 100
      `);
      return json(res, result.rows);
    } catch (e) {
      res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
    }
  }

  else if (url === '/api/stats') {
    try {
      const result = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM rss_brain.rss_articles) as total_articles,
          (SELECT COUNT(*) FROM rss_brain.article_summaries) as total_summaries,
          (SELECT COUNT(*) FROM rss_brain.rss_sources WHERE is_active = true) as total_sources,
          (SELECT COUNT(*) FROM rss_brain.digest_runs) as total_runs
      `);
      return json(res, result.rows[0]);
    } catch (e) {
      res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
    }
  }

  else if (url === '/api/runs') {
    try {
      const result = await pool.query(`
        SELECT id, status, articles_fetched, articles_summarized, notes, created_at
        FROM rss_brain.digest_runs
        ORDER BY created_at DESC
        LIMIT 10
      `);
      return json(res, result.rows);
    } catch (e) {
      res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
    }
  }

  // ── Static files ────────────────────────────────────────────────────────────
  else {
    let filePath = path.join(PUBLIC_DIR, url === '/' ? 'index.html' : url);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, data2) => {
          if (err2) { res.writeHead(404); res.end('Not found'); return; }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(data2);
        });
        return;
      }
      const ext = path.extname(filePath);
      const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
      res.end(data);
    });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`RSS Brain UI running at http://localhost:${PORT}`));
