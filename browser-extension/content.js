// Content script for AI Reader browser extension

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    // Get page content for saving
    const content = {
      title: document.title,
      url: window.location.href,
      content: document.body.innerText,
      html: document.body.innerHTML
    };
    sendResponse(content);
  }

  if (request.action === 'getSelectedText') {
    const selection = window.getSelection();
    sendResponse({ text: selection.toString() });
  }

  return true;
});

// Add context menu highlight functionality
document.addEventListener('mouseup', (e) => {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (selectedText.length > 0) {
    // Check if AI Reader quick-save is enabled
    chrome.storage.sync.get(['quickHighlight'], (result) => {
      if (result.quickHighlight) {
        showQuickSaveButton(e.pageX, e.pageY, selectedText);
      }
    });
  }
});

// Quick save button
let quickSaveBtn = null;

function showQuickSaveButton(x, y, text) {
  removeQuickSaveButton();

  quickSaveBtn = document.createElement('div');
  quickSaveBtn.className = 'ai-reader-quick-save';
  quickSaveBtn.innerHTML = `
    <button class="ai-reader-btn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      保存高亮
    </button>
  `;
  quickSaveBtn.style.cssText = `
    position: absolute;
    left: ${x}px;
    top: ${y + 10}px;
    z-index: 999999;
  `;

  quickSaveBtn.querySelector('button').addEventListener('click', async () => {
    const { serverUrl } = await chrome.storage.sync.get(['serverUrl']);
    const server = serverUrl || 'http://localhost:3001';

    try {
      // First, save the article if not exists
      const articleRes = await fetch(`${server}/api/articles/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: window.location.href })
      });

      const articleData = await articleRes.json();
      const articleId = articleData.id || articleData.articleId;

      if (articleId) {
        // Save highlight
        await fetch(`${server}/api/highlights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            article_id: articleId,
            text: text,
            color: 'yellow'
          })
        });

        // Visual feedback
        quickSaveBtn.innerHTML = '<span style="color: #10b981;">✓ 已保存</span>';
        setTimeout(removeQuickSaveButton, 1000);
      }
    } catch (err) {
      quickSaveBtn.innerHTML = '<span style="color: #ef4444;">保存失败</span>';
      setTimeout(removeQuickSaveButton, 2000);
    }
  });

  document.body.appendChild(quickSaveBtn);

  // Remove on click outside
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside);
  }, 100);
}

function handleClickOutside(e) {
  if (quickSaveBtn && !quickSaveBtn.contains(e.target)) {
    removeQuickSaveButton();
  }
}

function removeQuickSaveButton() {
  if (quickSaveBtn) {
    quickSaveBtn.remove();
    quickSaveBtn = null;
    document.removeEventListener('click', handleClickOutside);
  }
}
