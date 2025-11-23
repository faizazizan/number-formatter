document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('sitemap-form');
    const urlInput = document.getElementById('url-input');
    const checkBtn = document.getElementById('check-btn');
    const resultsContainer = document.getElementById('results-container');
    const robotsStatusEl = document.getElementById('robots-status');
    const llmRulesContainer = document.getElementById('llm-rules');
    const sitemapsContainer = document.getElementById('sitemaps-list');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = urlInput.value.trim();
        if (!url) return;

        // Reset UI
        resultsContainer.classList.remove('visible');
        checkBtn.disabled = true;
        checkBtn.innerHTML = '<i class="fas fa-spinner spinner"></i> Checking...';

        try {
            const response = await fetch('/api/check-sitemap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (response.ok) {
                displayResults(data);
            } else {
                alert('Error: ' + (data.error || 'Failed to check sitemap'));
            }

        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while checking the URL.');
        } finally {
            checkBtn.disabled = false;
            checkBtn.innerHTML = 'Check Sitemap';
        }
    });

    function displayResults(data) {
        // Robots.txt Status
        const statusClass = data.robotsStatus === 'Found' ? 'found' : 'not-found';
        robotsStatusEl.innerHTML = `<span class="status-value ${statusClass}">${data.robotsStatus}</span>`;

        // LLM Rules
        llmRulesContainer.innerHTML = '';
        if (data.llmRules && data.llmRules.length > 0) {
            data.llmRules.forEach(rule => {
                const div = document.createElement('div');
                div.className = 'llm-item';
                div.innerHTML = `
                    <span class="llm-name">${rule.bot}</span>
                    <span class="llm-status ${rule.status.toLowerCase()}">${rule.status}</span>
                `;
                llmRulesContainer.appendChild(div);
            });
        } else {
            llmRulesContainer.innerHTML = '<div class="empty-state">No specific LLM rules detected</div>';
        }

        // Sitemaps
        sitemapsContainer.innerHTML = '';
        if (data.sitemaps && data.sitemaps.length > 0) {
            data.sitemaps.forEach(sitemap => {
                const div = document.createElement('div');
                div.className = 'sitemap-item';
                const statusClass = sitemap.status === 200 ? 'ok' : 'error';
                div.innerHTML = `
                    <a href="${sitemap.url}" target="_blank" class="sitemap-url">${sitemap.url}</a>
                    <div class="sitemap-meta">
                        <span class="source-badge">${sitemap.source}</span>
                        <span class="http-status ${statusClass}">Status: ${sitemap.status}</span>
                    </div>
                `;
                sitemapsContainer.appendChild(div);
            });
        } else {
            sitemapsContainer.innerHTML = '<div class="empty-state">No sitemaps found</div>';
        }

        resultsContainer.classList.add('visible');
    }
});
