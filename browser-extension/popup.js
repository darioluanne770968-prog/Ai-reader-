// Default server URL
const DEFAULT_SERVER = 'http://localhost:3001';

// Load saved settings
document.addEventListener('DOMContentLoaded', async () => {
  // Get server URL from storage
  const { serverUrl } = await chrome.storage.sync.get(['serverUrl']);
  document.getElementById('serverUrl').value = serverUrl || DEFAULT_SERVER;

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  document.getElementById('pageTitle').textContent = tab.title || 'Unknown';
  document.getElementById('pageUrl').textContent = tab.url || '';
});

// Save settings when URL changes
document.getElementById('serverUrl').addEventListener('change', async (e) => {
  await chrome.storage.sync.set({ serverUrl: e.target.value });
});

// Save to reading list
document.getElementById('saveBtn').addEventListener('click', async () => {
  const btn = document.getElementById('saveBtn');
  const status = document.getElementById('status');
  const serverUrl = document.getElementById('serverUrl').value || DEFAULT_SERVER;

  btn.disabled = true;
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin">
      <circle cx="12" cy="12" r="10" stroke-dasharray="40" stroke-dashoffset="10"/>
    </svg>
    保存中...
  `;

  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Send to server
    const response = await fetch(`${serverUrl}/api/articles/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: tab.url })
    });

    const data = await response.json();

    if (response.ok) {
      status.className = 'status success';
      status.textContent = '保存成功！';
      status.style.display = 'block';

      // Show success and close after delay
      setTimeout(() => {
        window.close();
      }, 1500);
    } else {
      throw new Error(data.error || '保存失败');
    }
  } catch (error) {
    status.className = 'status error';
    status.textContent = error.message || '保存失败，请检查服务器地址';
    status.style.display = 'block';

    btn.disabled = false;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      保存到阅读列表
    `;
  }
});

// Open AI Reader app
document.getElementById('openAppBtn').addEventListener('click', async () => {
  const serverUrl = document.getElementById('serverUrl').value || DEFAULT_SERVER;
  chrome.tabs.create({ url: serverUrl });
});
