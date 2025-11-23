// dotenv not needed
const express = require('express');
const path = require('path');
const axios = require('axios');
const robotsParser = require('robots-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
// Serve static files from the public directory
app.use(express.static('public'));

// Sitemap Checker API
app.post('/api/check-sitemap', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const baseUrl = new URL(url).origin;
        const robotsUrl = `${baseUrl}/robots.txt`;

        let robotsContent = null;
        let robotsStatus = 'Not Found';
        let sitemaps = [];
        let llmRules = [];

        // 1. Fetch robots.txt
        try {
            const robotsResponse = await axios.get(robotsUrl, { timeout: 10000, validateStatus: () => true });
            robotsStatus = robotsResponse.status === 200 ? 'Found' : `Status: ${robotsResponse.status}`;
            if (robotsResponse.status === 200) {
                robotsContent = robotsResponse.data;
            }
        } catch (error) {
            robotsStatus = 'Error fetching';
        }

        // 2. Parse robots.txt if found
        if (robotsContent && typeof robotsContent === 'string') {
            const robots = robotsParser(robotsUrl, robotsContent);

            // Check for Sitemaps in robots.txt
            const robotsSitemaps = robots.getSitemaps();
            sitemaps = robotsSitemaps.map(s => ({ url: s, source: 'robots.txt' }));

            // Check for LLM Bots
            const llmBots = ['GPTBot', 'CCBot', 'Google-Extended', 'anthropic-ai', 'Claude-Web', 'FacebookBot'];

            llmBots.forEach(bot => {
                const disallow = robots.isDisallowed(baseUrl + '/', bot);
                if (disallow) {
                    llmRules.push({ bot, status: 'Blocked' });
                } else {
                    // We can't easily know if it's explicitly allowed or just not mentioned without manual parsing, 
                    // but robots-parser gives us effective access. 
                    // Let's do a simple regex check to see if the bot is mentioned at all to be more informative
                    const regex = new RegExp(`User-agent:\\s*${bot}`, 'i');
                    if (regex.test(robotsContent)) {
                        llmRules.push({ bot, status: 'Allowed' });
                    }
                }
            });
        }

        // 3. Check common sitemap locations if none found (or always, depending on requirement. Let's add common ones if not present)
        const commonSitemaps = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap/sitemap.xml'];
        for (const path of commonSitemaps) {
            const sitemapUrl = `${baseUrl}${path}`;
            if (!sitemaps.find(s => s.url === sitemapUrl)) {
                sitemaps.push({ url: sitemapUrl, source: 'guessed' });
            }
        }

        // 4. Check status of all sitemaps
        const sitemapResults = await Promise.all(sitemaps.map(async (sitemap) => {
            try {
                const response = await axios.head(sitemap.url, { timeout: 5000, validateStatus: () => true });
                return { ...sitemap, status: response.status };
            } catch (err) {
                return { ...sitemap, status: 'Error' };
            }
        }));

        // Filter out guessed ones that don't exist
        const finalSitemaps = sitemapResults.filter(s => {
            if (s.source === 'guessed' && s.status !== 200) return false;
            return true;
        });

        res.json({
            robotsStatus,
            llmRules,
            sitemaps: finalSitemaps
        });

    } catch (error) {
        console.error('Error checking sitemap:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
