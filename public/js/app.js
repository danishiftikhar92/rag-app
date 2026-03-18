document.addEventListener('DOMContentLoaded', () => {
  initUploadPage();
  initWebsitePage();
  initChatPage();
  initDeleteSource();
});

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function setLoading(btn, loading) {
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  if (text) text.style.display = loading ? 'none' : '';
  if (loader) loader.style.display = loading ? 'inline-flex' : 'none';
  btn.disabled = loading;
}

// ── Upload page ──

function initUploadPage() {
  const form = document.getElementById('upload-form');
  if (!form) return;

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const fileList = document.getElementById('file-list');
  const fileListItems = document.getElementById('file-list-items');
  const uploadBtn = document.getElementById('upload-btn');
  let selectedFiles = [];

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    addFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', () => addFiles(fileInput.files));

  function addFiles(files) {
    for (const file of files) {
      if (!selectedFiles.find((f) => f.name === file.name)) {
        selectedFiles.push(file);
      }
    }
    renderFileList();
  }

  function renderFileList() {
    if (selectedFiles.length === 0) {
      fileList.style.display = 'none';
      uploadBtn.disabled = true;
      return;
    }

    fileList.style.display = 'block';
    uploadBtn.disabled = false;
    fileListItems.innerHTML = '';

    selectedFiles.forEach((file, idx) => {
      const li = document.createElement('li');
      const size = file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      li.innerHTML = `
        <span>${file.name}</span>
        <span>
          <span class="file-size">${size}</span>
          <button class="remove-file" data-idx="${idx}">&times;</button>
        </span>`;
      fileListItems.appendChild(li);
    });

    fileListItems.querySelectorAll('.remove-file').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedFiles.splice(parseInt(btn.dataset.idx), 1);
        renderFileList();
      });
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setLoading(uploadBtn, true);
    const resultBox = document.getElementById('upload-result');
    resultBox.style.display = 'none';

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append('files', file));
    const collectionName = document.getElementById('collectionName').value.trim();
    if (collectionName) formData.append('collectionName', collectionName);

    try {
      const res = await fetch('/api/rag/ingest', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok) {
        resultBox.className = 'result-box success';
        resultBox.innerHTML = `<strong>${data.message}</strong><br>Total chunks created: ${data.totalChunks}<br>Files: ${data.files.join(', ')}`;
        selectedFiles = [];
        renderFileList();
        showToast('Files ingested successfully!');
      } else {
        resultBox.className = 'result-box error';
        resultBox.textContent = data.message || 'Ingestion failed';
        showToast('Ingestion failed', 'error');
      }
    } catch (err) {
      resultBox.className = 'result-box error';
      resultBox.textContent = `Error: ${err.message}`;
      showToast('Network error', 'error');
    }

    resultBox.style.display = 'block';
    setLoading(uploadBtn, false);
  });
}

// ── Website page ──

function initWebsitePage() {
  const form = document.getElementById('url-form');
  if (!form) return;

  const urlBtn = document.getElementById('url-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const url = document.getElementById('url').value.trim();
    const collectionName = document.getElementById('urlCollectionName').value.trim();
    if (!url) return;

    setLoading(urlBtn, true);
    const resultBox = document.getElementById('url-result');
    resultBox.style.display = 'none';

    try {
      const res = await fetch('/api/rag/ingest/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, collectionName: collectionName || undefined }),
      });
      const data = await res.json();

      if (res.ok) {
        resultBox.className = 'result-box success';
        resultBox.innerHTML = `<strong>${data.message}</strong><br>Chunks created: ${data.totalChunks}`;
        showToast('Website ingested successfully!');
      } else {
        resultBox.className = 'result-box error';
        resultBox.textContent = data.message || 'Ingestion failed';
        showToast('Ingestion failed', 'error');
      }
    } catch (err) {
      resultBox.className = 'result-box error';
      resultBox.textContent = `Error: ${err.message}`;
      showToast('Network error', 'error');
    }

    resultBox.style.display = 'block';
    setLoading(urlBtn, false);
  });
}

// ── Chat page ──

function initChatPage() {
  const form = document.getElementById('chat-form');
  if (!form) return;

  const messages = document.getElementById('chat-messages');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question) return;

    // Remove welcome message
    const welcome = messages.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    appendMessage('user', question);
    input.value = '';
    sendBtn.disabled = true;

    const thinkingEl = appendThinking();

    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      thinkingEl.remove();

      if (res.ok) {
        appendMessage('assistant', data.answer, data.sources);
      } else {
        appendMessage('assistant', `Error: ${data.message || 'Query failed'}`);
      }
    } catch (err) {
      thinkingEl.remove();
      appendMessage('assistant', `Network error: ${err.message}`);
    }

    sendBtn.disabled = false;
    input.focus();
  });

  function appendMessage(role, text, sources) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    bubble.textContent = text;

    if (sources && sources.length > 0) {
      const sourcesDiv = document.createElement('div');
      sourcesDiv.className = 'sources';
      sourcesDiv.innerHTML = '<strong>Sources</strong>';
      sources.forEach((s) => {
        const span = document.createElement('span');
        span.className = 'source-item';
        span.textContent = `${s.source_type}: ${s.source}`;
        sourcesDiv.appendChild(span);
      });
      bubble.appendChild(sourcesDiv);
    }

    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  function appendThinking() {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble thinking';
    bubble.innerHTML = '<div class="thinking-dots"><span></span><span></span><span></span></div> Thinking...';
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  }
}

// ── Dashboard: delete source ──

function initDeleteSource() {
  const buttons = document.querySelectorAll('.btn-delete-source');
  if (buttons.length === 0) return;

  const modal1 = document.getElementById('delete-modal');
  const modal2 = document.getElementById('delete-modal-final');
  let pendingId = null;
  let pendingName = '';

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      pendingId = btn.dataset.id;
      pendingName = btn.dataset.name;
      const chunks = btn.dataset.chunks;

      document.getElementById('delete-source-name').textContent = pendingName;
      document.getElementById('delete-chunk-count').textContent = chunks;
      modal1.style.display = 'flex';
    });
  });

  document.getElementById('delete-cancel').addEventListener('click', () => {
    modal1.style.display = 'none';
    pendingId = null;
  });

  modal1.addEventListener('click', (e) => {
    if (e.target === modal1) {
      modal1.style.display = 'none';
      pendingId = null;
    }
  });

  document.getElementById('delete-confirm-first').addEventListener('click', () => {
    modal1.style.display = 'none';
    document.getElementById('delete-source-name-final').textContent = pendingName;
    document.getElementById('delete-confirm-input').value = '';
    document.getElementById('delete-confirm-final').disabled = true;
    modal2.style.display = 'flex';
    document.getElementById('delete-confirm-input').focus();
  });

  document.getElementById('delete-confirm-input').addEventListener('input', (e) => {
    document.getElementById('delete-confirm-final').disabled =
      e.target.value.trim() !== 'DELETE';
  });

  document.getElementById('delete-cancel-final').addEventListener('click', () => {
    modal2.style.display = 'none';
    pendingId = null;
  });

  modal2.addEventListener('click', (e) => {
    if (e.target === modal2) {
      modal2.style.display = 'none';
      pendingId = null;
    }
  });

  document.getElementById('delete-confirm-final').addEventListener('click', async () => {
    if (!pendingId) return;

    const btn = document.getElementById('delete-confirm-final');
    btn.disabled = true;
    btn.textContent = 'Deleting...';

    try {
      const res = await fetch(`/api/rag/source/${pendingId}`, { method: 'DELETE' });
      if (res.ok) {
        modal2.style.display = 'none';
        showToast(`"${pendingName}" deleted successfully`);
        setTimeout(() => location.reload(), 500);
      } else {
        const data = await res.json();
        showToast(data.message || 'Deletion failed', 'error');
        btn.disabled = false;
        btn.textContent = 'Permanently Delete';
      }
    } catch (err) {
      showToast('Network error', 'error');
      btn.disabled = false;
      btn.textContent = 'Permanently Delete';
    }
  });
}

// ── Dashboard: clear all ──

async function clearKnowledgeBase() {
  if (!confirm('Are you sure you want to clear the entire knowledge base? This cannot be undone.')) return;

  try {
    const res = await fetch('/api/rag/clear', { method: 'DELETE' });
    if (res.ok) {
      showToast('Knowledge base cleared!');
      setTimeout(() => location.reload(), 500);
    } else {
      showToast('Failed to clear knowledge base', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
}
