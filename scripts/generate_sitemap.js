const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://dailysnake.org';
const ROOT_DIR = path.resolve(__dirname, '..');
const GAMES_DIR = path.join(ROOT_DIR, 'games');

function generateSitemap() {
    const urls = [];

    // Homepage
    urls.push({
        loc: `${DOMAIN}/`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'daily',
        priority: '1.0'
    });

    if (fs.existsSync(GAMES_DIR)) {
        const gameFolders = fs.readdirSync(GAMES_DIR).filter(item => {
            const fullPath = path.join(GAMES_DIR, item);
            return fs.statSync(fullPath).isDirectory();
        });

        // Sort descending (newest games first)
        gameFolders.sort().reverse();

        for (const folder of gameFolders) {
            const indexPath = path.join(GAMES_DIR, folder, 'index.html');
            if (fs.existsSync(indexPath)) {
                const stat = fs.statSync(indexPath);
                const lastmod = stat.mtime.toISOString().split('T')[0];
                
                // Extra priority for daily games
                const isDaily = folder.startsWith('daily-');
                const priority = isDaily ? '0.8' : '0.7';
                const changefreq = isDaily ? 'monthly' : 'weekly';

                urls.push({
                    loc: `${DOMAIN}/games/${folder}/`,
                    lastmod: lastmod,
                    changefreq: changefreq,
                    priority: priority
                });
            }
        }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    const sitemapPath = path.join(ROOT_DIR, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, xml, 'utf8');
    console.log(`[Sitemap] Generated sitemap.xml with ${urls.length} URLs at ${sitemapPath}`);
}

generateSitemap();
