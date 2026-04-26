(function() {
	//#region content_scripts/modules/state.js
	/**
	* Central reactive state store.
	* Single source of truth for all content-script state.
	*/
	var state = {
		isActive: false,
		hoveredEl: null,
		selectedEl: null,
		selections: [],
		drawnBoxes: /* @__PURE__ */ new Map(),
		loadRetries: 0,
		drawTimeout: null,
		observer: null,
		overlayRoot: null,
		hoverBox: null,
		labelEl: null,
		nameDialog: null,
		toastEl: null,
		toastTimer: null
	};
	var listeners = [];
	function getState() {
		return state;
	}
	function setState(partial) {
		Object.assign(state, partial);
		notify(partial);
	}
	function notify(changed) {
		for (const fn of listeners) try {
			fn(state, changed);
		} catch (e) {
			console.error("[PyxisExtractor] state listener error:", e);
		}
	}
	//#endregion
	//#region content_scripts/modules/dom-overlay.js
	/**
	* All visual DOM operations: overlay creation, hover boxes, selected boxes, labels, dialogs, toasts.
	*/
	function createOverlay() {
		const s = getState();
		s.overlayRoot = document.createElement("div");
		s.overlayRoot.className = "px-overlay-root";
		s.hoverBox = document.createElement("div");
		s.hoverBox.className = "px-hover-box";
		s.overlayRoot.appendChild(s.hoverBox);
		s.labelEl = document.createElement("div");
		s.labelEl.className = "px-label";
		s.overlayRoot.appendChild(s.labelEl);
		s.toastEl = document.createElement("div");
		s.toastEl.className = "px-toast";
		s.overlayRoot.appendChild(s.toastEl);
		document.body.appendChild(s.overlayRoot);
	}
	function showHover(el) {
		const s = getState();
		const rect = el.getBoundingClientRect();
		const scrollX = window.scrollX;
		const scrollY = window.scrollY;
		s.hoverBox.style.left = rect.left + scrollX + "px";
		s.hoverBox.style.top = rect.top + scrollY + "px";
		s.hoverBox.style.width = rect.width + "px";
		s.hoverBox.style.height = rect.height + "px";
		s.hoverBox.style.display = "block";
		const tag = el.tagName.toLowerCase();
		const cls = el.className && typeof el.className === "string" ? "." + el.className.split(/\s+/).filter(Boolean).join(".") : "";
		const dims = `${Math.round(rect.width)}×${Math.round(rect.height)}`;
		s.labelEl.innerHTML = `<span class="px-label-tag">${tag}</span><span class="px-label-class">${cls}</span> <span class="px-label-dim">${dims}</span>`;
		s.labelEl.style.left = rect.left + scrollX + "px";
		s.labelEl.style.top = rect.top + scrollY - 24 + "px";
		s.labelEl.style.display = "block";
	}
	function hideHover() {
		const s = getState();
		s.hoverBox.style.display = "none";
		s.labelEl.style.display = "none";
		setState({ hoveredEl: null });
	}
	function drawSelectedBox(el, id, name, selector) {
		const s = getState();
		removeDrawnBox(id);
		const rect = el.getBoundingClientRect();
		const scrollX = window.scrollX;
		const scrollY = window.scrollY;
		const box = document.createElement("div");
		box.className = "px-selected-box";
		box.style.left = rect.left + scrollX + "px";
		box.style.top = rect.top + scrollY + "px";
		box.style.width = rect.width + "px";
		box.style.height = rect.height + "px";
		const label = document.createElement("div");
		label.className = "px-label";
		label.innerHTML = `<span class="px-label-tag">${escapeHtml(name)}</span>`;
		label.style.left = rect.left + scrollX + "px";
		label.style.top = rect.top + scrollY - 24 + "px";
		label.style.pointerEvents = "auto";
		label.title = "Click to remove";
		label.addEventListener("click", (e) => {
			e.stopPropagation();
			removeSelectionById(id);
		});
		s.overlayRoot.appendChild(box);
		s.overlayRoot.appendChild(label);
		s.drawnBoxes.set(id, {
			box,
			label,
			selector,
			name
		});
	}
	function removeDrawnBox(id) {
		const s = getState();
		const drawn = s.drawnBoxes.get(id);
		if (drawn) {
			drawn.box.remove();
			drawn.label.remove();
			s.drawnBoxes.delete(id);
		}
	}
	function removeSelectionById(id) {
		const s = getState();
		const sel = s.selections.find((sel) => sel.id === id);
		if (!sel) return;
		setState({ selections: s.selections.filter((sel) => sel.id !== id) });
		removeDrawnBox(id);
		showToast(`Removed "${sel.componentName}"`);
	}
	function updateAllBoxes() {
		const s = getState();
		for (const drawn of s.drawnBoxes.values()) try {
			const el = document.querySelector(drawn.selector);
			if (el) {
				const rect = el.getBoundingClientRect();
				const scrollX = window.scrollX;
				const scrollY = window.scrollY;
				drawn.box.style.display = "block";
				drawn.label.style.display = "block";
				drawn.box.style.left = rect.left + scrollX + "px";
				drawn.box.style.top = rect.top + scrollY + "px";
				drawn.box.style.width = rect.width + "px";
				drawn.box.style.height = rect.height + "px";
				drawn.label.style.left = rect.left + scrollX + "px";
				drawn.label.style.top = rect.top + scrollY - 24 + "px";
			} else {
				drawn.box.style.display = "none";
				drawn.label.style.display = "none";
			}
		} catch (e) {
			drawn.box.style.display = "none";
			drawn.label.style.display = "none";
		}
	}
	function clearAllBoxes() {
		const s = getState();
		for (const drawn of s.drawnBoxes.values()) {
			drawn.box.remove();
			drawn.label.remove();
		}
		s.drawnBoxes.clear();
	}
	function showNameDialog(el, clientX, clientY, onSave) {
		const s = getState();
		setState({ selectedEl: el });
		hideHover();
		const tag = el.tagName.toLowerCase();
		const cls = el.className && typeof el.className === "string" ? el.className.split(/\s+/).filter(Boolean).join(" ") : "";
		const rect = el.getBoundingClientRect();
		const dialog = document.createElement("div");
		dialog.className = "px-name-dialog";
		dialog.innerHTML = `
    <h4>Name this component</h4>
    <div class="px-info">${tag}${cls ? " ." + cls : ""} · ${Math.round(rect.width)}×${Math.round(rect.height)}</div>
    <input type="text" placeholder="e.g. ShowCard, NavBar, Button..." autocomplete="off" />
    <div class="px-buttons">
      <button class="px-cancel">Cancel</button>
      <button class="px-save">Save</button>
    </div>
  `;
		const input = dialog.querySelector("input");
		const saveBtn = dialog.querySelector(".px-save");
		const cancelBtn = dialog.querySelector(".px-cancel");
		const close = () => {
			dialog.remove();
			setState({ nameDialog: null });
		};
		saveBtn.addEventListener("click", () => {
			const name = input.value.trim();
			if (name) {
				onSave(name);
				close();
			} else showToast("Please enter a component name");
		});
		cancelBtn.addEventListener("click", close);
		input.addEventListener("keydown", (ev) => {
			if (ev.key === "Enter") {
				const name = input.value.trim();
				if (name) {
					onSave(name);
					close();
				}
			}
			if (ev.key === "Escape") close();
		});
		const dialogW = 260;
		const dialogH = 140;
		const vpW = window.innerWidth;
		const vpH = window.innerHeight;
		let left = clientX + window.scrollX;
		let top = clientY + window.scrollY + 16;
		if (left + dialogW > vpW + window.scrollX) left = vpW + window.scrollX - dialogW - 10;
		if (top + dialogH > vpH + window.scrollY) top = clientY + window.scrollY - dialogH - 10;
		dialog.style.left = left + "px";
		dialog.style.top = top + "px";
		s.overlayRoot.appendChild(dialog);
		setState({ nameDialog: dialog });
		input.focus();
	}
	function closeNameDialog() {
		const s = getState();
		if (s.nameDialog) {
			s.nameDialog.remove();
			setState({
				nameDialog: null,
				selectedEl: null
			});
		}
	}
	function showToast(msg) {
		const s = getState();
		s.toastEl.textContent = msg;
		s.toastEl.classList.add("visible");
		clearTimeout(s.toastTimer);
		s.toastTimer = setTimeout(() => s.toastEl.classList.remove("visible"), 2500);
	}
	function isOverlayElement(el) {
		return el.closest && el.closest(".px-overlay-root");
	}
	function escapeHtml(str) {
		const div = document.createElement("div");
		div.textContent = str;
		return div.innerHTML;
	}
	//#endregion
	//#region content_scripts/modules/capture.js
	/**
	* Element metadata extraction: bbox, computed CSS, selectors, HTML.
	*/
	var CSS_KEYS = [
		"display",
		"position",
		"flexDirection",
		"justifyContent",
		"alignItems",
		"gap",
		"padding",
		"margin",
		"borderRadius",
		"backgroundColor",
		"color",
		"fontSize",
		"fontWeight",
		"fontFamily",
		"lineHeight",
		"textAlign",
		"boxShadow",
		"border",
		"width",
		"height",
		"minWidth",
		"minHeight",
		"maxWidth",
		"maxHeight",
		"overflow",
		"cursor",
		"zIndex"
	];
	function captureElement(el, name) {
		const rect = el.getBoundingClientRect();
		const computed = window.getComputedStyle(el);
		const styles = {};
		for (const k of CSS_KEYS) {
			const val = computed.getPropertyValue(k);
			if (val && val !== "normal" && val !== "auto" && val !== "0px" && val !== "rgba(0, 0, 0, 0)") styles[k] = val;
		}
		return {
			id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
			componentName: name,
			pageUrl: location.href,
			pageTitle: document.title,
			timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
			viewport: {
				width: window.innerWidth,
				height: window.innerHeight
			},
			outerHTML: el.outerHTML.slice(0, 1e4),
			innerHTML: el.innerHTML.slice(0, 5e3),
			textContent: el.textContent.trim().slice(0, 500),
			computedCSS: styles
		};
	}
	function getAttributes(el) {
		const attrs = {};
		for (const attr of el.attributes) attrs[attr.name] = attr.value;
		return attrs;
	}
	function generateSelector(el) {
		if (el.dataset) for (const key of Object.keys(el.dataset)) return `[data-${kebabCase(key)}="${el.dataset[key]}"]`;
		if (el.id) return `#${el.id}`;
		const classes = Array.from(el.classList || []).filter((c) => !c.startsWith("px-"));
		if (classes.length > 0) {
			const sel = el.tagName.toLowerCase() + "." + classes.join(".");
			if (document.querySelectorAll(sel).length === 1) return sel;
		}
		const parent = el.parentElement;
		if (parent) {
			const index = Array.from(parent.children).filter((c) => c.tagName === el.tagName).indexOf(el) + 1;
			return generateSelector(parent) + " > " + el.tagName.toLowerCase() + ":nth-of-type(" + index + ")";
		}
		return el.tagName.toLowerCase();
	}
	function kebabCase(str) {
		return str.replace(/([A-Z])/g, "-$1").toLowerCase();
	}
	//#endregion
	//#region content_scripts/modules/storage.js
	/**
	* chrome.storage.local abstraction.
	*/
	var STORAGE_KEY = () => "px_selections_" + location.href;
	async function loadSelections() {
		return new Promise((resolve) => {
			chrome.storage.local.get([STORAGE_KEY()], (result) => {
				const saved = result[STORAGE_KEY()];
				resolve(saved && Array.isArray(saved) ? saved : []);
			});
		});
	}
	async function saveSelections(selections) {
		return new Promise((resolve) => {
			chrome.storage.local.set({ [STORAGE_KEY()]: selections }, resolve);
		});
	}
	async function clearSelections() {
		return new Promise((resolve) => {
			chrome.storage.local.remove(STORAGE_KEY(), resolve);
		});
	}
	//#endregion
	//#region content_scripts/modules/events.js
	/**
	* Mouse, keyboard, scroll/resize event handlers.
	*/
	function bindEvents() {
		document.addEventListener("mousemove", onMouseMove, true);
		document.addEventListener("click", onClick, true);
		document.addEventListener("keydown", onKeyDown, true);
		window.addEventListener("scroll", onScrollResize, { passive: true });
		window.addEventListener("resize", onScrollResize, { passive: true });
	}
	function onMouseMove(e) {
		const s = getState();
		if (!s.isActive || s.nameDialog) return;
		const el = document.elementFromPoint(e.clientX, e.clientY);
		if (!el || el === s.hoveredEl || isOverlayElement(el)) return;
		setState({ hoveredEl: el });
		showHover(el);
	}
	function onClick(e) {
		const s = getState();
		if (!s.isActive) return;
		if (s.nameDialog) return;
		if (isOverlayElement(e.target)) return;
		e.preventDefault();
		e.stopPropagation();
		const el = document.elementFromPoint(e.clientX, e.clientY);
		if (!el || isOverlayElement(el)) return;
		const targetEl = e.shiftKey && el.parentElement && el.parentElement !== document.body ? el.parentElement : el;
		showNameDialog(targetEl, e.clientX, e.clientY, (name) => {
			const data = captureElement(targetEl, name);
			const newSelections = [...s.selections, data];
			setState({ selections: newSelections });
			saveSelections(newSelections);
			drawSelectedBox(targetEl, data.id, name, data.selector);
			showToast(`Saved "${name}" — ${newSelections.length} on this page`);
		});
	}
	function onKeyDown(e) {
		const s = getState();
		if (!s.isActive) return;
		if (e.key === "Escape") if (s.nameDialog) closeNameDialog();
		else {
			setState({ isActive: false });
			hideHover();
			closeNameDialog();
		}
	}
	function onScrollResize() {
		updateAllBoxes();
	}
	//#endregion
	//#region content_scripts/modules/messaging.js
	/**
	* Chrome runtime message handlers.
	*/
	function initMessaging() {
		chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
			const s = getState();
			if (msg.action === "toggle") {
				const newActive = !s.isActive;
				setState({ isActive: newActive });
				if (!newActive) {
					hideHover();
					closeNameDialog();
				}
				showToast(newActive ? "Selection mode ON — hover and click to select" : "Selection mode OFF");
				sendResponse({
					active: newActive,
					count: s.selections.length
				});
			}
			if (msg.action === "getState") sendResponse({
				active: s.isActive,
				count: s.selections.length,
				url: location.href,
				title: document.title
			});
			if (msg.action === "getSelections") sendResponse({ selections: s.selections });
			if (msg.action === "clearPage") {
				clearAllBoxes();
				setState({ selections: [] });
				clearSelections();
				sendResponse({ cleared: true });
			}
			if (msg.action === "exportManifest") sendResponse({ manifest: {
				version: "1.0",
				generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
				source: {
					project: "pyxis",
					url: location.href,
					title: document.title
				},
				selections: s.selections
			} });
			if (msg.action === "importManifest") if (msg.selections && Array.isArray(msg.selections)) {
				importSelections(msg.selections);
				sendResponse({ imported: s.selections.length });
			} else sendResponse({ error: "Invalid selections array" });
		});
	}
	async function importSelections(newSelections) {
		clearAllBoxes();
		const filtered = newSelections.filter((sel) => sel.pageUrl === location.href);
		setState({
			selections: filtered,
			loadRetries: 0
		});
		await saveSelections(filtered);
		attemptDrawSelections$1();
	}
	function attemptDrawSelections$1() {
		const s = getState();
		if (s.drawTimeout) clearTimeout(s.drawTimeout);
		let foundCount = 0;
		for (const sel of s.selections) {
			if (s.drawnBoxes.has(sel.id)) {
				foundCount++;
				continue;
			}
			try {
				const el = document.querySelector(sel.selector);
				if (el) {
					drawSelectedBox(el, sel.id, sel.componentName, sel.selector);
					foundCount++;
				}
			} catch (e) {}
		}
		if (foundCount < s.selections.length && s.loadRetries < 40) {
			setState({ loadRetries: s.loadRetries + 1 });
			setState({ drawTimeout: setTimeout(attemptDrawSelections$1, 500) });
		} else if (foundCount === s.selections.length) showToast(`Restored ${foundCount} selections`);
		else showToast(`Restored ${foundCount}/${s.selections.length} selections`);
	}
	//#endregion
	//#region content_scripts/main.js
	/**
	* Entry point — wires all modules together.
	*/
	async function init() {
		createOverlay();
		bindEvents();
		initMessaging();
		const saved = await loadSelections();
		if (saved.length > 0) {
			setState({ selections: saved });
			attemptDrawSelections();
		}
		const observer = new MutationObserver(() => {
			const s = getState();
			if (s.selections.length > 0 && s.drawnBoxes.size < s.selections.length && !s.drawTimeout) attemptDrawSelections();
		});
		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
		setState({ observer });
	}
	function attemptDrawSelections() {
		const s = getState();
		if (s.drawTimeout) clearTimeout(s.drawTimeout);
		let foundCount = 0;
		for (const sel of s.selections) {
			if (s.drawnBoxes.has(sel.id)) {
				foundCount++;
				continue;
			}
			try {
				const el = document.querySelector(sel.selector);
				if (el) {
					drawSelectedBox(el, sel.id, sel.componentName, sel.selector);
					foundCount++;
				}
			} catch (e) {}
		}
		if (foundCount < s.selections.length && s.loadRetries < 40) {
			setState({ loadRetries: s.loadRetries + 1 });
			setState({ drawTimeout: setTimeout(attemptDrawSelections, 500) });
		} else if (foundCount === s.selections.length) showToast(`Restored ${foundCount} selections`);
		else showToast(`Restored ${foundCount}/${s.selections.length} selections`);
	}
	init();
	//#endregion
})();
