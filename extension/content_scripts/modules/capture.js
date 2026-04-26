/**
 * Element metadata extraction: bbox, computed CSS, selectors, HTML.
 */

const CSS_KEYS = [
  'display', 'position', 'flexDirection', 'justifyContent', 'alignItems',
  'gap', 'padding', 'margin', 'borderRadius', 'backgroundColor', 'color',
  'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'textAlign',
  'boxShadow', 'border', 'width', 'height', 'minWidth', 'minHeight',
  'maxWidth', 'maxHeight', 'overflow', 'cursor', 'zIndex'
];

export function captureElement(el, name) {
  const rect = el.getBoundingClientRect();
  const computed = window.getComputedStyle(el);
  const styles = {};

  for (const k of CSS_KEYS) {
    const val = computed.getPropertyValue(k);
    if (val && val !== 'normal' && val !== 'auto' && val !== '0px' && val !== 'rgba(0, 0, 0, 0)') {
      styles[k] = val;
    }
  }

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    componentName: name,
    pageUrl: location.href,
    pageTitle: document.title,
    timestamp: new Date().toISOString(),
    selector: generateSelector(el),
    tagName: el.tagName.toLowerCase(),
    classList: Array.from(el.classList || []),
    attributes: getAttributes(el),
    boundingBox: {
      x: Math.round(rect.left + window.scrollX),
      y: Math.round(rect.top + window.scrollY),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    outerHTML: el.outerHTML.slice(0, 10000),
    innerHTML: el.innerHTML.slice(0, 5000),
    textContent: el.textContent.trim().slice(0, 500),
    computedCSS: styles
  };
}

export function getAttributes(el) {
  const attrs = {};
  for (const attr of el.attributes) {
    attrs[attr.name] = attr.value;
  }
  return attrs;
}

export function generateSelector(el) {
  if (el.dataset) {
    for (const key of Object.keys(el.dataset)) {
      return `[data-${kebabCase(key)}="${el.dataset[key]}"]`;
    }
  }
  if (el.id) return `#${el.id}`;
  const classes = Array.from(el.classList || []).filter(c => !c.startsWith('px-'));
  if (classes.length > 0) {
    const sel = el.tagName.toLowerCase() + '.' + classes.join('.');
    if (document.querySelectorAll(sel).length === 1) return sel;
  }
  const parent = el.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
    const index = siblings.indexOf(el) + 1;
    return generateSelector(parent) + ' > ' + el.tagName.toLowerCase() + ':nth-of-type(' + index + ')';
  }
  return el.tagName.toLowerCase();
}

export function kebabCase(str) {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}
