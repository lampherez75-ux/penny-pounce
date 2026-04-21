const ALARM_PRICE_CHECK = 'pennyPriceDropCheck';

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_PRICE_CHECK, { periodInMinutes: 360 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_PRICE_CHECK) return;
  chrome.storage.local.get(['tier', 'priceAlertSkus'], (s) => {
    const tier = s.tier || 'lite';
    if (tier === 'lite') return;
    void s.priceAlertSkus;
    // Future: call /api/alerts with cached product keys (Pro: cache, Max: live).
  });
});
