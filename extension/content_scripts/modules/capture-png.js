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
