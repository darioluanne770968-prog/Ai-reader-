// Background service worker for AI Reader extension

// Context menu for saving pages
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu item
  chrome.contextMenus.create({
    id: 'save-to-ai-reader',
    title: '保存到 AI Reader',
    contexts: ['page', 'link']
  });

  chrome.contextMenus.create({
    id: 'save-selection-to-ai-reader',
    title: '保存选中内容为高亮',
    contexts: ['selection']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { serverUrl } = await chrome.storage.sync.get(['serverUrl']);
  const server = serverUrl || 'http://localhost:3001';

  if (info.menuItemId === 'save-to-ai-reader') {
    const url = info.linkUrl || tab.url;

    try {
      const response = await fetch(`${server}/api/articles/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (response.ok) {
        // Show notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon128.png',
          title: 'AI Reader',
          message: '文章已保存到阅读列表'
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: 'AI Reader',
        message: `保存失败: ${error.message}`
      });
    }
  }

  if (info.menuItemId === 'save-selection-to-ai-reader' && info.selectionText) {
    try {
      // First save the article
      const articleRes = await fetch(`${server}/api/articles/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: tab.url })
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
            text: info.selectionText,
            color: 'yellow'
          })
        });

        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon128.png',
          title: 'AI Reader',
          message: '高亮已保存'
        });
      }
    } catch (error) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: 'AI Reader',
        message: `保存失败: ${error.message}`
      });
    }
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-page') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const { serverUrl } = await chrome.storage.sync.get(['serverUrl']);
    const server = serverUrl || 'http://localhost:3001';

    try {
      await fetch(`${server}/api/articles/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: tab.url })
      });

      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: 'AI Reader',
        message: '文章已保存'
      });
    } catch (error) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: 'AI Reader',
        message: '保存失败'
      });
    }
  }
});
