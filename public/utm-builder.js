// UTM Builder JavaScript

// Get form elements
const destinationInput = document.getElementById('destination-url');
const sourceInput = document.getElementById('source');
const mediumInput = document.getElementById('medium');
const campaignInput = document.getElementById('campaign');
const contentInput = document.getElementById('content');
const termInput = document.getElementById('term');

const previewUrl = document.getElementById('preview-url');
const copyUrlBtn = document.getElementById('copy-url-btn');

// Update preview in real-time
function updatePreview() {
    const url = destinationInput.value.trim();
    if (!url) {
        previewUrl.textContent = 'Enter campaign details to see preview';
        return;
    }

    const params = new URLSearchParams();
    if (sourceInput.value) params.append('utm_source', sourceInput.value);
    if (mediumInput.value) params.append('utm_medium', mediumInput.value);
    if (campaignInput.value) params.append('utm_campaign', campaignInput.value);
    if (contentInput.value) params.append('utm_content', contentInput.value);
    if (termInput.value) params.append('utm_term', termInput.value);

    const separator = url.includes('?') ? '&' : '?';
    const fullUrl = params.toString() ? `${url}${separator}${params.toString()}` : url;

    previewUrl.textContent = fullUrl;
}

// Add event listeners for real-time preview
[destinationInput, sourceInput, mediumInput, campaignInput, contentInput, termInput].forEach(input => {
    input.addEventListener('input', updatePreview);
});

// Copy URL to clipboard
copyUrlBtn.addEventListener('click', async () => {
    const urlText = previewUrl.textContent;

    if (urlText === 'Enter campaign details to see preview') {
        alert('Please enter campaign details first');
        return;
    }

    try {
        await navigator.clipboard.writeText(urlText);

        const originalText = copyUrlBtn.innerHTML;
        copyUrlBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        copyUrlBtn.style.background = 'linear-gradient(135deg, hsl(120, 60%, 50%), hsl(150, 60%, 50%))';

        setTimeout(() => {
            copyUrlBtn.innerHTML = originalText;
            copyUrlBtn.style.background = '';
        }, 2000);
    } catch (error) {
        console.error('Failed to copy:', error);
        alert('Failed to copy to clipboard');
    }
});

// Initialize preview
updatePreview();
