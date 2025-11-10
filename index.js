/**
 * Ensure champ-select treats disabled skins as visually unlocked by injecting
 * a companion stylesheet (and falling back to inline rules if it fails).
 */
(function enableLockedSkinPreview() {
  const LOG_PREFIX = '[LPP-UI][skin-preview]';
  const STYLE_ID = 'lpp-ui-unlock-skins-css';
  const INLINE_ID = `${STYLE_ID}-inline`;
  const STYLESHEET_NAME = 'style.css';
  const REWARD_ICON = '/fe/lol-collections/images/item-element/rewards-program-icon.svg';
  const BADGE_FLAG = 'data-skin-reward-badge';

  const INLINE_RULES = `
    .skin-selection-carousel .skin-selection-item {
      position: relative;
      z-index: 1;
    }

    .skin-selection-carousel .skin-selection-item .skin-selection-item-information {
      position: relative;
      z-index: 2;
    }

    .skin-selection-carousel .skin-selection-item.disabled,
    .skin-selection-carousel .skin-selection-item[aria-disabled="true"] {
      filter: grayscale(0) saturate(1.1) contrast(1.05) !important;
      -webkit-filter: grayscale(0) saturate(1.1) contrast(1.05) !important;
      pointer-events: auto !important;
      cursor: pointer !important;
    }

    .skin-selection-carousel .skin-selection-item.disabled .skin-selection-thumbnail,
    .skin-selection-carousel .skin-selection-item[aria-disabled="true"] .skin-selection-thumbnail {
      filter: grayscale(0) saturate(1.15) contrast(1.05) !important;
      -webkit-filter: grayscale(0) saturate(1.15) contrast(1.05) !important;
      transition: filter 0.25s ease;
    }

    .skin-selection-carousel .skin-selection-item.disabled::before,
    .skin-selection-carousel .skin-selection-item.disabled::after,
    .skin-selection-carousel .skin-selection-item[aria-disabled="true"]::before,
    .skin-selection-carousel .skin-selection-item[aria-disabled="true"]::after,
    .skin-selection-carousel .skin-selection-item.disabled .skin-selection-thumbnail::before,
    .skin-selection-carousel .skin-selection-item.disabled .skin-selection-thumbnail::after,
    .skin-selection-carousel .skin-selection-item[aria-disabled="true"] .skin-selection-thumbnail::before,
    .skin-selection-carousel .skin-selection-item[aria-disabled="true"] .skin-selection-thumbnail::after {
      display: none !important;
    }

    .skin-selection-carousel .skin-selection-item.disabled .locked-state,
    .skin-selection-carousel .skin-selection-item[aria-disabled="true"] .locked-state {
      display: none !important;
    }

    .unlock-skin-hit-area {
      display: none !important;
      pointer-events: none !important;
    }

    .unlock-skin-hit-area .locked-state {
      display: none !important;
    }

 

    .skin-selection-carousel-container .skin-selection-carousel .skin-selection-item .skin-selection-thumbnail {
      height: 100% !important;
      margin: 0 !important;
      transition: filter 0.25s ease !important;
      transform: none !important;
    }

    .skin-selection-carousel-container .skin-selection-carousel .skin-selection-item.skin-selection-item-selected {
      background: #3c3c41 !important;
    }

    .skin-selection-carousel-container .skin-selection-carousel .skin-selection-item.skin-selection-item-selected .skin-selection-thumbnail {
      height: 100% !important;
      margin: 0 !important;
    }


  `;

  const log = {
    info: (msg, extra) => console.info(`${LOG_PREFIX} ${msg}`, extra ?? ''),
    warn: (msg, extra) => console.warn(`${LOG_PREFIX} ${msg}`, extra ?? ''),
  };

  function resolveStylesheetHref() {
    try {
      const script =
        document.currentScript ||
        document.querySelector('script[src$="index.js"]') ||
        document.querySelector('script[src*="LPP-UI"]');

      if (script?.src) {
        return new URL(STYLESHEET_NAME, script.src).toString();
      }
    } catch (error) {
      log.warn('failed to resolve stylesheet URL; falling back to relative path', error);
    }

    return STYLESHEET_NAME;
  }

  function injectInlineRules() {
    if (document.getElementById(INLINE_ID)) {
      return;
    }

    const styleTag = document.createElement('style');
    styleTag.id = INLINE_ID;
    styleTag.textContent = INLINE_RULES;
    document.head.appendChild(styleTag);
    log.warn('applied inline fallback styling');
  }

  function removeInlineRules() {
    const existing = document.getElementById(INLINE_ID);
    if (existing) {
      existing.remove();
    }
  }

  function attachStylesheet() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = resolveStylesheetHref();

    link.addEventListener('load', () => {
      removeInlineRules();
      log.info('external stylesheet loaded');
    });

    link.addEventListener('error', () => {
      link.remove();
      injectInlineRules();
    });

    document.head.appendChild(link);
  }

  function addBadgeToSkin(skinItem) {
    if (!skinItem) {
      return;
    }

    if (skinItem.hasAttribute(BADGE_FLAG)) {
      return;
    }

    const infoDiv = skinItem.querySelector('.skin-selection-item-information');
    if (!infoDiv) {
      return;
    }

    const existingBadge = skinItem.querySelector('.lpp-reward-badge');
    if (existingBadge) {
      skinItem.setAttribute(BADGE_FLAG, 'true');
      return;
    }

    const legacyBadge = infoDiv.querySelector('.reward-badge');
    if (legacyBadge) {
      legacyBadge.closest('.info-badge-wrapper')?.remove();
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'info-badge-wrapper badge-0 lpp-reward-badge';
    wrapper.style.position = 'absolute';
    wrapper.style.top = '-5px';
    wrapper.style.right = '-6px';
    wrapper.style.zIndex = '5';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.transform = 'scale(1.75)';
    wrapper.style.transformOrigin = 'top right';

    const img = document.createElement('img');
    img.src = REWARD_ICON;
    img.className = 'reward-badge';

    wrapper.appendChild(img);
    if (getComputedStyle(infoDiv).position === 'static') {
      infoDiv.style.position = 'relative';
    }
    infoDiv.appendChild(wrapper);

    skinItem.setAttribute(BADGE_FLAG, 'true');
  }

  function scanSkinSelection() {
    document.querySelectorAll('.skin-selection-item').forEach(addBadgeToSkin);
  }

  function setupBadgeObserver() {
    const observer = new MutationObserver(scanSkinSelection);
    observer.observe(document.body, { childList: true, subtree: true });

    // Re-scan periodically as a safety net (LCU sometimes swaps DOM wholesale)
    const intervalId = setInterval(scanSkinSelection, 2000);

    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.visibilityState === 'visible') {
          scanSkinSelection();
        }
      },
      false
    );

    // Return cleanup in case we ever need it
    return () => {
      observer.disconnect();
      clearInterval(intervalId);
    };
  }

  function init() {
    if (!document || !document.head) {
      requestAnimationFrame(init);
      return;
    }

    attachStylesheet();
    scanSkinSelection();
    setupBadgeObserver();
    log.info('skin preview & reward badge overrides active');
  }

  if (typeof document === 'undefined') {
    log.warn('document unavailable; aborting');
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

