// Lists every Markdown file in /content/blog and returns its raw contents.
// This lets the homepage render cards automatically whenever a new post is
// committed by the CMS — no manifest edit required. The frontend falls back
// to /content/blog/index.json if this endpoint is unavailable.
const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const dir = path.join(process.cwd(), 'content', 'blog');
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.md'));

    const posts = files.map((f) => ({
      slug: f.replace(/\.md$/, ''),
      raw: fs.readFileSync(path.join(dir, f), 'utf8'),
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({ posts });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err), posts: [] });
  }
};
