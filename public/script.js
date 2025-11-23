document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.querySelector('.browse-btn');
    const urlInput = document.getElementById('url-input');
    const fetchBtn = document.getElementById('fetch-btn');
    const gallerySection = document.getElementById('gallery-section');
    const galleryGrid = document.getElementById('gallery-grid');
    const imageCount = document.getElementById('image-count');
    const convertAllBtn = document.getElementById('convert-all-btn');
    const downloadAllBtn = document.getElementById('download-all-btn');
    const addMoreBtn = document.getElementById('add-more-btn');

    let imagesToConvert = []; // Array of objects: { id: string, type: 'file'|'url', data: File|String }
    let convertedFiles = [];

    // Tab Switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
        });
    });

    // Drag & Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });

    // File Input
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    // Add More Button
    addMoreBtn.addEventListener('click', () => fileInput.click());

    function handleFiles(files) {
        if (files.length > 0) {
            Array.from(files).forEach(file => {
                if (file.type.startsWith('image/')) {
                    const id = Math.random().toString(36).substring(7);
                    imagesToConvert.push({ id, type: 'file', data: file });
                    addImageToGallery(id, file, URL.createObjectURL(file));
                }
            });
            updateGalleryVisibility();
        }
        // Reset input
        fileInput.value = '';
    }

    // Helper to check if format is allowed
    function isFormatAllowed(mimeType) {
        const selectedFormats = Array.from(document.querySelectorAll('.filter-options input:checked')).map(cb => cb.value);

        // Map common extensions to mime types for URL checking
        if (!mimeType.includes('/')) {
            const ext = mimeType.toLowerCase().replace('.', '');
            if (['jpg', 'jpeg'].includes(ext)) mimeType = 'image/jpeg';
            else if (ext === 'png') mimeType = 'image/png';
            else if (ext === 'gif') mimeType = 'image/gif';
            else if (ext === 'webp') mimeType = 'image/webp';
            else mimeType = 'other';
        }

        if (selectedFormats.includes(mimeType)) return true;

        const standardTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (selectedFormats.includes('other') && !standardTypes.includes(mimeType)) return true;

        return false;
    }

    // URL Fetch
    fetchBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) return;

        fetchBtn.innerHTML = '<i class="fas fa-spinner spinner"></i> Fetching...';
        fetchBtn.disabled = true;

        try {
            const response = await fetch('/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const data = await response.json();

            if (data.images && data.images.length > 0) {
                let addedCount = 0;
                data.images.forEach(imgUrl => {
                    // Check filter
                    const ext = imgUrl.split('.').pop().split('?')[0];
                    if (isFormatAllowed(ext)) {
                        const id = Math.random().toString(36).substring(7);
                        imagesToConvert.push({ id, type: 'url', data: imgUrl });
                        addImageToGallery(id, { name: imgUrl.split('/').pop() }, imgUrl);
                        addedCount++;
                    }
                });

                if (addedCount > 0) {
                    updateGalleryVisibility();
                } else {
                    alert('No images found matching selected formats.');
                }
            } else {
                alert('No images found on this URL.');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to fetch images.');
        } finally {
            fetchBtn.innerHTML = '<i class="fas fa-search"></i> Fetch Images';
            fetchBtn.disabled = false;
        }
    });

    function addImageToGallery(id, file, src) {
        const div = document.createElement('div');
        div.className = 'image-card';
        div.dataset.id = id;
        div.innerHTML = `
            <button class="remove-btn" onclick="removeImage('${id}')"><i class="fas fa-times"></i></button>
            <img src="${src}" class="image-preview" alt="${file.name}">
            <div class="image-info">
                <div class="image-details">
                    <div class="image-name" title="${file.name}">${file.name}</div>
                    <div class="image-status">
                        <span class="status-badge"></span> <span class="status-text">Pending</span>
                    </div>
                </div>
                <!-- Download button will be appended here -->
            </div>
        `;
        galleryGrid.appendChild(div);
    }

    // Global function for remove button
    window.removeImage = function (id) {
        imagesToConvert = imagesToConvert.filter(img => img.id !== id);
        const card = document.querySelector(`.image-card[data-id="${id}"]`);
        if (card) {
            card.remove();
        }
        updateGalleryVisibility();
    };

    function updateGalleryVisibility() {
        imageCount.textContent = imagesToConvert.length;
        if (imagesToConvert.length > 0) {
            gallerySection.classList.remove('hidden');
        } else {
            gallerySection.classList.add('hidden');
        }
    }

    // Convert All
    convertAllBtn.addEventListener('click', async () => {
        if (imagesToConvert.length === 0) return;

        convertAllBtn.innerHTML = '<i class="fas fa-spinner spinner"></i> Converting...';
        convertAllBtn.disabled = true;

        const fileItems = imagesToConvert.filter(i => i.type === 'file');
        const urlItems = imagesToConvert.filter(i => i.type === 'url');

        const files = fileItems.map(i => i.data);
        const urls = urlItems.map(i => i.data);

        try {
            // Upload files
            if (files.length > 0) {
                const formData = new FormData();
                files.forEach(file => formData.append('images', file));

                const res = await fetch('/api/convert', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                convertedFiles = [...convertedFiles, ...data.files];

                // Add download buttons for files
                console.log('Processing file response:', data.files);
                data.files.forEach((file, index) => {
                    if (fileItems[index]) {
                        console.log(`Adding btn for file index ${index}, id ${fileItems[index].id}`);
                        addDownloadButton(fileItems[index].id, file.url);
                    } else {
                        console.warn(`No matching file item for index ${index}`);
                    }
                });
            }

            // Process URLs
            if (urls.length > 0) {
                const res = await fetch('/api/convert-remote', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrls: urls })
                });
                const data = await res.json();
                convertedFiles = [...convertedFiles, ...data.files];

                // Add download buttons for URLs
                console.log('Processing URL response:', data.files);
                data.files.forEach((file, index) => {
                    if (urlItems[index]) {
                        console.log(`Adding btn for URL index ${index}, id ${urlItems[index].id}`);
                        addDownloadButton(urlItems[index].id, file.url);
                    } else {
                        console.warn(`No matching URL item for index ${index}`);
                    }
                });
            }

            // Show download all if any files were converted
            if (convertedFiles.length > 0) {
                downloadAllBtn.classList.remove('hidden');
            }

        } catch (error) {
            console.error(error);
            alert('Some conversions failed.');
        } finally {
            convertAllBtn.innerHTML = '<i class="fas fa-check"></i> Done';
            setTimeout(() => {
                convertAllBtn.innerHTML = '<i class="fas fa-bolt"></i> Convert All';
                convertAllBtn.disabled = false;
            }, 2000);
        }
    });

    function addDownloadButton(id, url) {
        const card = document.querySelector(`.image-card[data-id="${id}"]`);
        if (!card) return;

        const infoDiv = card.querySelector('.image-info');
        if (infoDiv.querySelector('.download-single-btn')) return;

        // Update status to converted
        const statusBadge = card.querySelector('.status-badge');
        const statusText = card.querySelector('.status-text');
        if (statusBadge) statusBadge.className = 'status-badge success';
        if (statusText) statusText.textContent = 'Converted';

        const btn = document.createElement('a');
        btn.href = url;
        btn.download = '';
        btn.className = 'download-single-btn visible';
        btn.innerHTML = '<i class="fas fa-download"></i>';
        btn.title = "Download WebP";

        infoDiv.appendChild(btn);
    }

    // Download ZIP
    downloadAllBtn.addEventListener('click', async () => {
        if (convertedFiles.length === 0) return;

        downloadAllBtn.innerHTML = '<i class="fas fa-spinner spinner"></i> Zipping...';

        try {
            const filenames = convertedFiles.map(f => f.filename);
            const response = await fetch('/api/zip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: filenames })
            });
            const data = await response.json();

            // Trigger download
            const a = document.createElement('a');
            a.href = data.url;
            a.download = '';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

        } catch (error) {
            console.error(error);
            alert('Failed to create zip.');
        } finally {
            downloadAllBtn.innerHTML = '<i class="fas fa-download"></i> Download ZIP';
        }
    });
});
