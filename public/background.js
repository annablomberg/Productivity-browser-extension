const timerWindowKey = 'timerWindowId';

chrome.action.onClicked.addListener(async () => {
  try {
    const stored = await chrome.storage.session.get(timerWindowKey);
    const existingId = stored[timerWindowKey];

    if (typeof existingId === 'number') {
      try {
        await chrome.windows.update(existingId, { focused: true, state: 'normal' });
        return;
      } catch {
        // The window was closed while the service worker was asleep.
      }
    }

    const window = await chrome.windows.create({
      url: chrome.runtime.getURL('index.html'),
      type: 'popup',
      width: 400,
      height: 560,
    });
    if (window?.id !== undefined) {
      await chrome.storage.session.set({ [timerWindowKey]: window.id });
    }
  } catch (error) {
    console.error('Could not open the productivity timer:', error);
  }
});
