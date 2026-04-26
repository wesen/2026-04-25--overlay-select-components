/**
 * PNG capture for selected DOM elements using html2canvas.
 */

import html2canvas from 'html2canvas';

/**
 * Capture a DOM element as a PNG data URL.
 * @param {HTMLElement} el
 * @returns {Promise<string|null>} PNG data URL or null on failure
 */
export async function captureElementPng(el) {
  try {
    const canvas = await html2canvas(el, {
      backgroundColor: null,
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });
    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('[PyxisExtractor] PNG capture failed:', e);
    return null;
  }
}

/**
 * Capture the entire page as a PNG with overlay boxes drawn on top.
 * @param {Array} selections — array of selection objects with selector and componentName
 * @returns {Promise<string|null>} PNG data URL or null on failure
 */
export async function captureFullPageWithOverlay(selections) {
  try {
    // Hide the real overlay so it doesn't interfere with capture
    const overlay = document.querySelector('.px-overlay-root');
    const originalDisplay = overlay ? overlay.style.display : '';
    if (overlay) overlay.style.display = 'none';

    // Capture the full page
    const canvas = await html2canvas(document.documentElement, {
      backgroundColor: null,
      scale: 1,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    // Restore overlay
    if (overlay) overlay.style.display = originalDisplay;

    // Draw overlay boxes manually onto the canvas
    const ctx = canvas.getContext('2d');
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    for (const sel of selections) {
      try {
        const el = document.querySelector(sel.selector);
        if (!el) continue;

        const rect = el.getBoundingClientRect();
        const x = rect.left + scrollX;
        const y = rect.top + scrollY;
        const w = rect.width;
        const h = rect.height;

        // Draw selection box
        ctx.strokeStyle = '#0066ff';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        // Fill with semi-transparent blue
        ctx.fillStyle = 'rgba(0, 102, 255, 0.08)';
        ctx.fillRect(x, y, w, h);

        // Draw label background
        const label = sel.componentName;
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif';
        const textMetrics = ctx.measureText(label);
        const labelW = textMetrics.width + 12;
        const labelH = 22;
        const labelX = x;
        const labelY = Math.max(0, y - labelH - 2);

        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.roundRect(labelX, labelY, labelW, labelH, 4);
        ctx.fill();

        // Draw label text
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, labelX + 6, labelY + labelH / 2);
      } catch (e) {
        // Skip elements that can't be drawn
      }
    }

    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('[PyxisExtractor] Full page capture failed:', e);
    return null;
  }
}
