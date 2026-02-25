
  // ─── CONFIG ──────────────────────────────────────────────────────────────────
  // The n8n postgres endpoint isn't directly accessible from the browser,
  // so we query our own backend API. For the static nginx setup, we use
  // the postgres REST-style approach via a local proxy endpoint.
  // Since we're serving from nginx with no backend, we'll query the
  // postgres view directly via a lightweight fetch to our API endpoint.
  
  // For the nginx static setup, data comes from /api/digest endpoint
  // which we'll implement as a simple nginx proxy or node script.
  // For now, we support both a /api/digest endpoint AND demo data fallback.

  const API_BASE = '/api';
  
  let allArticles = [];
  let currentFilter = 'all';
  let currentSource = null;

  // ─── LOAD DATA ───────────────────────────────────────────────────────────────
  async function loadData() {
    try {
      const [articlesRes, statsRes, runsRes] = await Promise.all([
        fetch(`${API_BASE}/articles`),
        fetch(`${API_BASE}/stats`),
        fetch(`${API_BASE}/runs`)
      ]);

      if (!articlesRes.ok) throw new Error('API not available');

      const articles = await articlesRes.json();
      const stats = await statsRes.json();
      const runs = await runsRes.json();

      allArticles = articles;
      renderStats(stats);
      renderSources(articles);
      renderRuns(runs);
      renderArticles();
      updateLastRunTime(runs);

    } catch (err) {
      // Fall back to demo data so the UI still looks great
      loadDemoData();
    }
  }

  function loadDemoData() {
    allArticles = [
      {
        id: 1, title: "Twitch is overhauling its suspensions policy",
        url: "https://example.com/twitch", source_name: "The Verge",
        published_at: new Date(Date.now() - 3600000).toISOString(),
        summary: "Twitch is revamping its suspension policy to include separate measures for streaming and chatting activities. The platform aims to provide more targeted penalties for specific types of misconduct.",
        key_points: ["Two new types of suspensions will be implemented: streaming and chatting", "The change aims to provide more targeted penalties", "Details on the specifics of the new policy are scarce"],
        sentiment: "neutral", relevance_score: 0.7,
        tags: ["Twitch", "suspension policy", "streaming"]
      },
      {
        id: 2, title: "OpenAI COO says AI hasn't yet really penetrated enterprise",
        url: "https://example.com/openai", source_name: "TechCrunch",
        published_at: new Date(Date.now() - 7200000).toISOString(),
        summary: "OpenAI's COO has stated that despite significant hype, artificial intelligence adoption in enterprise settings remains shallow. Most businesses are still in early experimental phases rather than deep integration.",
        key_points: ["Enterprise AI adoption is more surface-level than assumed", "Most companies are still in pilot phases", "Deeper integration requires significant workflow changes"],
        sentiment: "neutral", relevance_score: 0.85,
        tags: ["OpenAI", "enterprise", "AI adoption"]
      },
      {
        id: 3, title: "Stripe's valuation has increased by 74% to $159 billion",
        url: "https://example.com/stripe", source_name: "TechCrunch",
        published_at: new Date(Date.now() - 10800000).toISOString(),
        summary: "Stripe has seen a dramatic valuation increase of 74%, now valued at $159 billion following a tender offer. This marks a significant recovery and growth for the payments company.",
        key_points: ["Valuation jumped 74% to $159 billion", "Growth driven by a tender offer", "Stripe continues to dominate digital payments infrastructure"],
        sentiment: "positive", relevance_score: 0.9,
        tags: ["Stripe", "valuation", "fintech"]
      },
      {
        id: 4, title: "YouTube upgrades its $7.99/month Lite subscription with offline downloads",
        url: "https://example.com/youtube", source_name: "The Verge",
        published_at: new Date(Date.now() - 14400000).toISOString(),
        summary: "YouTube has enhanced its Lite subscription tier by adding offline download capabilities. The $7.99/month plan now competes more directly with the premium tier.",
        key_points: ["Offline downloads added to Lite plan", "Competitive pressure against Premium tier", "Rollout timeline not yet specified"],
        sentiment: "positive", relevance_score: 0.75,
        tags: ["YouTube", "subscription", "offline"]
      },
      {
        id: 5, title: "MIT researchers develop new approach to quantum error correction",
        url: "https://example.com/mit", source_name: "MIT Tech Review",
        published_at: new Date(Date.now() - 18000000).toISOString(),
        summary: "MIT researchers have announced a breakthrough in quantum error correction that could significantly reduce the overhead required for fault-tolerant quantum computing.",
        key_points: ["New error correction reduces qubit overhead", "Fault-tolerant computing becomes more practical", "Commercial applications still 5-10 years away"],
        sentiment: "positive", relevance_score: 0.95,
        tags: ["quantum", "MIT", "research", "computing"]
      }
    ];

    renderStats({
      total_articles: allArticles.length,
      total_summaries: allArticles.length,
      total_sources: 3,
      total_runs: 2
    });
    renderSources(allArticles);
    renderRuns([
      { id: 1, status: 'success', articles_fetched: 86, articles_summarized: 5, created_at: new Date().toISOString() }
    ]);
    renderArticles();
    document.getElementById('last-run-time').textContent = 'Demo mode — no API connected';
  }

  // ─── RENDER STATS ────────────────────────────────────────────────────────────
  function renderStats(stats) {
    document.getElementById('stat-articles').textContent = stats.total_articles ?? '—';
    document.getElementById('stat-summaries').textContent = stats.total_summaries ?? '—';
    document.getElementById('stat-sources').textContent = stats.total_sources ?? '—';
    document.getElementById('stat-runs').textContent = stats.total_runs ?? '—';
  }

  // ─── RENDER SOURCES ──────────────────────────────────────────────────────────
  function renderSources(articles) {
    const sources = {};
    articles.forEach(a => {
      const name = a.source_name || 'Unknown';
      sources[name] = (sources[name] || 0) + 1;
    });

    const container = document.getElementById('source-filters');
    container.innerHTML = Object.entries(sources).map(([name, count]) => `
      <button class="filter-btn" onclick="filterBySource('${name}', this)">
        ${name} <span class="count">${count}</span>
      </button>
    `).join('');

    // Update sentiment counts
    const counts = { all: articles.length, positive: 0, negative: 0, neutral: 0 };
    articles.forEach(a => { if (counts[a.sentiment] !== undefined) counts[a.sentiment]++; });
    document.getElementById('count-all').textContent = counts.all;
    document.getElementById('count-positive').textContent = counts.positive;
    document.getElementById('count-negative').textContent = counts.negative;
    document.getElementById('count-neutral').textContent = counts.neutral;
  }

  // ─── RENDER RUNS ─────────────────────────────────────────────────────────────
  function renderRuns(runs) {
    const container = document.getElementById('runs-list');
    if (!runs.length) { container.innerHTML = '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:0.65rem;color:var(--text-dim)">No runs yet</div>'; return; }

    container.innerHTML = runs.slice(0, 5).map(run => `
      <div class="run-item ${run.status}">
        <div class="run-time">${formatDate(run.created_at)}</div>
        <div>${run.articles_fetched} fetched · ${run.articles_summarized} summarized</div>
      </div>
    `).join('');
  }

  function updateLastRunTime(runs) {
    if (runs && runs.length) {
      document.getElementById('last-run-time').textContent = 'Last run: ' + formatDate(runs[0].created_at);
    }
  }

  // ─── FILTER & RENDER ARTICLES ────────────────────────────────────────────────
  function filterBy(sentiment, btn) {
    currentFilter = sentiment;
    currentSource = null;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderArticles();
  }

  function filterBySource(source, btn) {
    currentSource = source;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderArticles();
  }

  function renderArticles() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const sort = document.getElementById('sort-select').value;

    let filtered = allArticles.filter(a => {
      if (currentSource && a.source_name !== currentSource) return false;
      if (currentFilter !== 'all' && a.sentiment !== currentFilter) return false;
      if (search) {
        const haystack = `${a.title} ${a.summary} ${(a.tags || []).join(' ')}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    if (sort === 'relevance') filtered.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
    else if (sort === 'sentiment') filtered.sort((a, b) => a.sentiment.localeCompare(b.sentiment));
    else filtered.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

    const heading = document.getElementById('results-heading');
    heading.textContent = `${filtered.length} article${filtered.length !== 1 ? 's' : ''}${search ? ` matching "${search}"` : ''}`;

    const container = document.getElementById('articles-container');
    if (!filtered.length) {
      container.innerHTML = `<div class="empty-state"><span class="big">∅</span>No articles found</div>`;
      return;
    }

    container.innerHTML = filtered.map((a, i) => `
      <div class="article-card" style="animation-delay:${i * 0.04}s" onclick="toggleCard(this)">
        <div class="card-header">
          <div class="article-title">${escapeHtml(a.title)}</div>
          <div class="relevance-bar" title="Relevance: ${Math.round((a.relevance_score || 0.5) * 100)}%">
            <div class="relevance-fill" style="width:${(a.relevance_score || 0.5) * 100}%"></div>
          </div>
        </div>
        <div class="article-meta">
          <span class="source-badge">${escapeHtml(a.source_name || 'Unknown')}</span>
          <span class="article-date">${formatDate(a.published_at)}</span>
          ${a.sentiment ? `<span class="sentiment-badge ${a.sentiment}">${a.sentiment}</span>` : ''}
        </div>
        ${a.summary ? `<div class="article-summary">${escapeHtml(a.summary)}</div>` : ''}
        <div class="expanded-content">
          ${a.key_points && a.key_points.length ? `
            <div class="key-points-title">Key Points</div>
            <ul class="key-points">
              ${a.key_points.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
            </ul>
          ` : ''}
          ${a.tags && a.tags.length ? `
            <div class="tags-row">
              ${a.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
            </div>
          ` : ''}
          <a class="read-more" href="${a.url}" target="_blank" onclick="event.stopPropagation()">Read full article →</a>
        </div>
      </div>
    `).join('');
  }

  // ─── UTILS ───────────────────────────────────────────────────────────────────
  function toggleCard(card) {
    card.classList.toggle('expanded');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ─── INIT ────────────────────────────────────────────────────────────────────
  loadData();
</script>
</body>
</html>