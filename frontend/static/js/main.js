(() => {
    // IIFE for main application logic
    document.addEventListener("DOMContentLoaded", () => {
        // Event listener for DOM content loaded
        const currentPath = window.location.pathname;
        // Get current URL path
        const currentFile = currentPath.split("/").filter(Boolean).pop() || "index.html";
        // Extract current file name from path
        document.querySelectorAll(".app-nav .nav-link").forEach((link) => {
            // Loop through navigation links
            const href = link.getAttribute("href");
            // Get href attribute
            if (!href) return;
            const normalizedHref = href.replace(/^\.\//, "");
            // Normalize href by removing leading ./
            if (normalizedHref === currentFile || (currentFile === "index.html" && normalizedHref === "/")) {
                // Check if link matches current page
                link.classList.add("active");
                // Add active class to current page link
            }
        });
    });

    const helpers = {
        // Object containing utility helper functions
        formatCurrency(value) {
            // Function to format number as currency string
            const number = Number(value || 0);
            // Convert to number
            return number.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
            // Return formatted string
        },
        parseNumber(value) {
            // Function to parse string to number safely
            const normalized = String(value || "0").replace(/,/g, "");
            // Remove commas from string
            const number = Number.parseFloat(normalized);
            // Parse to float
            return Number.isNaN(number) ? 0 : number;
            // Return number or 0 if NaN
        },
        togglePreview(moduleId, isPreview) {
            // Function to toggle between edit and preview modes
            const moduleEl = document.getElementById(moduleId);
            // Get module element
            if (!moduleEl) return;
            const showPreview = Boolean(isPreview);
            // Convert to boolean
            moduleEl.classList.toggle("is-preview", showPreview);
            // Toggle CSS class
            
            // Toggle action buttons visibility
            const previewToggleBtn = moduleEl.querySelector('[id$="-preview-toggle"]');
            const exitPreviewBtn = moduleEl.querySelector('[id$="-exit-preview"]');
            const submitBtn = moduleEl.querySelector('[id$="-submit"]');
            
            if (showPreview) {
                previewToggleBtn?.setAttribute("hidden", "hidden");
                submitBtn?.removeAttribute("hidden");
                exitPreviewBtn?.removeAttribute("hidden");
            } else {
                previewToggleBtn?.removeAttribute("hidden");
                submitBtn?.removeAttribute("hidden");
                exitPreviewBtn?.setAttribute("hidden", "hidden");
            }
            
            const form = moduleEl.querySelector("form.document-editable");
            // Find editable form
            if (form) {
                if (showPreview) {
                    form.setAttribute("hidden", "hidden");
                    // Hide form in preview
                } else {
                    form.removeAttribute("hidden");
                    // Show form in edit
                }
            }
            moduleEl.querySelectorAll(".document").forEach((doc) => {
                // Loop through document elements
                if (!doc.classList.contains("document-editable")) {
                    // If not editable form
                    if (showPreview) {
                        doc.removeAttribute("hidden");
                        // Show preview documents
                    } else {
                        doc.setAttribute("hidden", "hidden");
                        // Hide preview documents
                    }
                }
            });
        },
    };

    const RECENTS_STORAGE_KEY = "billingapp.recents.v1";
    const LEGACY_RECENT_KEYS = ["billingapp.recentProjects"];
    const RECENTS_MAX_ITEMS = 50;

    const extensionForType = (type) => {
        // All documents now use .billproj extension
        return "billproj";
    };

    const ensureExtension = (name, ext) => {
        const safeExt = (ext || "").replace(/^\./, "").toLowerCase();
        if (!name || !name.trim()) {
            return `document.${safeExt || "dat"}`;
        }
        const trimmed = name.trim();
        return trimmed.toLowerCase().endsWith(`.${safeExt}`) ? trimmed : `${trimmed}.${safeExt}`;
    };

    const dispatchRecentsChanged = (list) => {
        try {
            window.dispatchEvent(new CustomEvent("billingapp:recents-changed", { detail: list }));
        } catch (error) {
            console.warn("Failed to dispatch recents change", error);
        }
    };

    const readJSON = (key) => {
        try {
            const raw = window.localStorage?.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : null;
        } catch (error) {
            console.warn("Failed to read", key, error);
            return null;
        }
    };

    const writeJSON = (key, value) => {
        try {
            window.localStorage?.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn("Failed to write", key, error);
        }
    };

    const migrateLegacyRecents = () => {
        const migrated = [];
        LEGACY_RECENT_KEYS.forEach((legacyKey) => {
            const legacyItems = readJSON(legacyKey);
            if (legacyItems && legacyItems.length) {
                legacyItems.forEach((entry) => {
                    migrated.push({
                        name: entry?.name || "Billing project",
                        path: entry?.path || null,
                        type: "project",
                        extension: "billproj",
                        lastAction: entry?.lastAction || "export",
                        timestamp: Number(entry?.timestamp) || Date.now(),
                    });
                });
            }
            try {
                window.localStorage?.removeItem(legacyKey);
            } catch (error) {
                /* ignore */
            }
        });
        return migrated;
    };

    const normalizeRecentEntry = (entry) => {
        const type = (entry?.type || "project").toLowerCase();
        const extension = entry?.extension || extensionForType(type);
        return {
            name: entry?.name || `Untitled ${type}`,
            path: entry?.path || null,
            type,
            extension,
            lastAction: entry?.lastAction || "save",
            timestamp: Number(entry?.timestamp) || Date.now(),
            metadata: entry?.metadata || null,
        };
    };

    const recentsStore = (() => {
        const load = () => {
            let list = readJSON(RECENTS_STORAGE_KEY);
            if (!list) {
                const migrated = migrateLegacyRecents();
                if (migrated.length) {
                    migrated.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
                    writeJSON(RECENTS_STORAGE_KEY, migrated);
                    dispatchRecentsChanged(migrated);
                    return migrated;
                }
                list = [];
            }
            return list.map(normalizeRecentEntry);
        };

        const save = (list) => {
            const normalized = list.map(normalizeRecentEntry);
            writeJSON(RECENTS_STORAGE_KEY, normalized);
            dispatchRecentsChanged(normalized);
            return normalized;
        };

        const add = (entry) => {
            const normalized = normalizeRecentEntry(entry);
            const existing = load();
            const key = normalized.path ? normalized.path.toLowerCase() : `${normalized.type}:${normalized.name}`.toLowerCase();
            const filtered = existing.filter((item) => {
                const itemKey = item.path ? item.path.toLowerCase() : `${item.type}:${item.name}`.toLowerCase();
                return itemKey !== key;
            });
            const next = [normalized, ...filtered].slice(0, RECENTS_MAX_ITEMS);
            save(next);
            return normalized;
        };

        const clear = () => save([]);

        return { load, save, add, clear };
    })();

    helpers.recents = {
        load: () => recentsStore.load().slice(),
        save: (list) => recentsStore.save(Array.isArray(list) ? list : []),
        add: (entry) => recentsStore.add(entry),
        clear: () => recentsStore.clear(),
    };

    helpers.recordRecent = (entry) => recentsStore.add(entry);

    helpers.ensureExtension = ensureExtension;
    helpers.extensionForType = extensionForType;
    const sharedTextEncoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
    const supportsFilePicker = () => typeof window.showSaveFilePicker === "function";

    const basename = (value) => {
        if (!value) return "";
        return value.split(/[\\/]/).pop() || value;
    };

    const ensureUint8Array = async (data, mimeType = "application/octet-stream") => {
        if (data instanceof Uint8Array) return data;
        if (data instanceof ArrayBuffer) return new Uint8Array(data);
        if (data instanceof Blob) {
            const buffer = await data.arrayBuffer();
            return new Uint8Array(buffer);
        }
        if (typeof data === "string") {
            if (sharedTextEncoder) return sharedTextEncoder.encode(data);
            return new TextEncoder().encode(data);
        }
        if (data == null) {
            return new Uint8Array();
        }
        return new Uint8Array((await new Blob([data], { type: mimeType }).arrayBuffer()));
    };

    const saveWithFilePicker = async ({ blob, suggestedName, description, extension, mimeType }) => {
        if (!supportsFilePicker()) return null;
        const ext = (extension || "").replace(/^\./, "");
        const suggested = ensureExtension(suggestedName || "document", ext || "dat");
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: suggested,
                types: [
                    {
                        description: description || "Billing App File",
                        accept: { [mimeType || blob.type || "application/octet-stream"]: [`.${ext}`] },
                    },
                ],
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return { name: handle.name || suggested };
        } catch (error) {
            if (error?.name === "AbortError" || error?.name === "SecurityError") {
                return null;
            }
            throw error;
        }
    };

    const downloadViaAnchor = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    };

    // Zoom controls for document workspace
    (function initZoomControls() {
    const ZOOM_STEP = 0.1;
    const ZOOM_MIN = 0.0; // allow 0% as requested (note: 0 will hide the canvas)
    const ZOOM_MAX = 3.0;

        function clamp(v) { return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v)); }

        function getModule() {
            // prefer the module section that contains a document workspace
            return document.querySelector('section.module[data-document-type]');
        }

        function getWorkspace(moduleEl) {
            // workspace element which holds the printable/editable document
            // fall back to the moduleEl itself if there is no dedicated .a4-workspace wrapper
            if (!moduleEl) return document.querySelector('.a4-workspace') || document.querySelector('section.module');
            return moduleEl.querySelector('.a4-workspace') || moduleEl;
        }

        function storageKey(moduleEl) {
            const type = moduleEl?.dataset?.documentType || 'global';
            return `billingapp:zoom:${type}`;
        }

        function readZoom(moduleEl) {
            try {
                const key = storageKey(moduleEl);
                const raw = localStorage.getItem(key);
                if (raw === null) return null; // no saved value
                const n = Number(raw);
                return Number.isFinite(n) ? clamp(n) : null;
            } catch (e) { return null; }
        }

        function writeZoom(moduleEl, value) {
            try { localStorage.setItem(storageKey(moduleEl), String(value)); } catch (e) { /* ignore */ }
        }

        function applyZoom(workspace, value) {
            if (!workspace) return;
            const clamped = clamp(value);
            workspace.style.setProperty('--zoom-level', clamped);
            // apply transform; use center origin so scaled document stays centered
            workspace.style.transform = `scale(${clamped})`;
            workspace.style.transformOrigin = 'center center';
            // prefer hiding overflow on the parent so scrollbars don't appear while zooming
            const parent = workspace.parentElement;
            if (parent) parent.style.overflow = 'hidden';
        }

        function computeFitZoom(moduleEl, workspace) {
            try {
                const doc = workspace.querySelector('.document');
                if (!doc) return 1.0;
                const docRect = doc.getBoundingClientRect();
                // use the workspace's parent (module body) as available area
                const container = workspace.parentElement || workspace;
                const availW = Math.max(20, container.clientWidth - 24);
                const availH = Math.max(20, container.clientHeight - 24);
                if (docRect.width <= 0 || docRect.height <= 0) return 1.0;
                const scaleW = availW / docRect.width;
                const scaleH = availH / docRect.height;
                const fit = Math.min(scaleW, scaleH);
                return clamp(Number.isFinite(fit) ? fit : 1.0);
            } catch (e) { return 1.0; }
        }

        function makeControlContainer() {
            const container = document.createElement('div');
            container.className = 'zoom-controls';
            container.innerHTML = `
                <button type="button" class="zoom-btn" data-action="out" title="Zoom out">−</button>
                <div class="zoom-display" aria-live="polite">100%</div>
                <button type="button" class="zoom-btn" data-action="in" title="Zoom in">+</button>
                <button type="button" class="zoom-btn" data-action="fit" title="Fit to page">Fit</button>
                <button type="button" class="zoom-btn" data-action="reset" title="Reset zoom">Reset</button>
            `;
            return container;
        }

        function bindContainerActions(container, moduleEl, workspace) {
            const actions = container.querySelectorAll('.zoom-btn');
            actions.forEach((btn) => {
                btn.addEventListener('click', (ev) => {
                    const action = btn.dataset.action;
                    const cur = readZoom(moduleEl) ?? computeFitZoom(moduleEl, workspace) ?? 1.0;
                    let next = cur;
                    if (action === 'in') next = clamp(parseFloat((cur + ZOOM_STEP).toFixed(3)));
                    if (action === 'out') next = clamp(parseFloat((cur - ZOOM_STEP).toFixed(3)));
                    if (action === 'reset') next = 1.0;
                    if (action === 'fit') next = computeFitZoom(moduleEl, workspace);
                    applyZoom(workspace, next);
                    writeZoom(moduleEl, next);
                    updateDisplay(container, next);
                });
            });
            // update initial display
            const savedOrFit = readZoom(moduleEl) ?? computeFitZoom(moduleEl, workspace) ?? 1.0;
            updateDisplay(container, savedOrFit);
        }

        function createControls(moduleEl, workspace) {
            if (!moduleEl || !workspace) return null;
            // avoid duplicate controls
            if (moduleEl.querySelector('.zoom-controls')) return moduleEl.querySelector('.zoom-controls');

            const container = makeControlContainer();
            bindContainerActions(container, moduleEl, workspace);

            // insert into module header actions if present, otherwise append to moduleEl
            const headerActions = moduleEl.querySelector('.module-actions');
            if (headerActions) {
                headerActions.appendChild(container);
            } else {
                moduleEl.insertBefore(container, moduleEl.firstChild);
            }
            return container;
        }

        function updateDisplay(container, zoom) {
            const disp = container.querySelector('.zoom-display');
            if (disp) disp.textContent = `${Math.round(zoom * 100)}%`;
        }

        // keyboard and wheel handlers
        function bindShortcuts(moduleEl, workspace) {
            window.addEventListener('keydown', (ev) => {
                if (!(ev.ctrlKey || ev.metaKey)) return;
                // ignore when typing in inputs
                const tag = (document.activeElement && document.activeElement.tagName) || '';
                if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
                if (ev.key === '+' || ev.key === '=' ) {
                    ev.preventDefault();
                    const next = clamp(readZoom(moduleEl) + ZOOM_STEP);
                    applyZoom(workspace, next); writeZoom(moduleEl, next);
                    const controls = moduleEl.querySelector('.zoom-controls'); if (controls) updateDisplay(controls, next);
                }
                if (ev.key === '-') {
                    ev.preventDefault();
                    const next = clamp(readZoom(moduleEl) - ZOOM_STEP);
                    applyZoom(workspace, next); writeZoom(moduleEl, next);
                    const controls = moduleEl.querySelector('.zoom-controls'); if (controls) updateDisplay(controls, next);
                }
                if (ev.key === '0') {
                    ev.preventDefault();
                    applyZoom(workspace, 1.0); writeZoom(moduleEl, 1.0);
                    const controls = moduleEl.querySelector('.zoom-controls'); if (controls) updateDisplay(controls, 1.0);
                }
            }, { passive: false });

            // Ctrl/Cmd + wheel
            window.addEventListener('wheel', (ev) => {
                if (!(ev.ctrlKey || ev.metaKey)) return;
                const delta = ev.deltaY;
                ev.preventDefault();
                const step = delta > 0 ? -ZOOM_STEP : ZOOM_STEP;
                const next = clamp(readZoom(moduleEl) + step);
                applyZoom(workspace, next); writeZoom(moduleEl, next);
                const controls = moduleEl.querySelector('.zoom-controls'); if (controls) updateDisplay(controls, next);
            }, { passive: false });
        }

        // initialize on DOM ready
        document.addEventListener('DOMContentLoaded', () => {
            const moduleEl = getModule();
            const workspace = getWorkspace(moduleEl);
            if (!workspace || !moduleEl) return;
            // ensure workspace is positioned to allow scaling
            workspace.style.willChange = 'transform';
            workspace.style.transition = 'transform 140ms ease';
            // apply saved zoom if present, otherwise compute fit-to-page so the document fits without scrollbars
            const saved = readZoom(moduleEl);
            const initial = (saved !== null && typeof saved !== 'undefined') ? saved : computeFitZoom(moduleEl, workspace);
            applyZoom(workspace, initial);
            // inject controls
            createControls(moduleEl, workspace);
            // if the module has a header actions area, prefer injecting controls there
            // otherwise create a floating toolbar so controls are reachable
            const headerActions = moduleEl.querySelector('.module-actions');
            if (!headerActions) {
                if (!document.querySelector('.zoom-floating-controls')) {
                    const floating = makeControlContainer();
                    floating.classList.add('zoom-floating-controls');
                    document.body.appendChild(floating);
                    bindContainerActions(floating, moduleEl, workspace);
                }
            }
            bindShortcuts(moduleEl, workspace);
        });
    })();
    helpers.saveDocument = async function ({ type, defaultName, data, metadata = {}, wrap = true }) {
        if (!type) throw new Error("Document type is required");
        const docType = type.toLowerCase();
        const extension = extensionForType(docType) || "dat";
        const timestamp = Date.now();
        const label = docType.charAt(0).toUpperCase() + docType.slice(1);
        const baseName = defaultName && defaultName.trim() ? defaultName.trim() : `${docType}-${new Date(timestamp).toISOString().slice(0, 10)}`;
        const suggestedName = ensureExtension(baseName, extension);
        const envelope = wrap === false ? data : {
            schema_version: 1,
            type: docType,
            saved_at: new Date(timestamp).toISOString(),
            metadata,
            data,
        };
        const content = typeof envelope === "string" ? envelope : JSON.stringify(envelope, null, 2);
        const mimeType = "application/json";
        const blob = new Blob([content], { type: mimeType });

        if (window.__TAURI__?.dialog?.save && window.__TAURI__?.fs?.writeBinaryFile) {
            const { dialog, fs } = window.__TAURI__;
            let savePath = await dialog.save({
                defaultPath: suggestedName,
                filters: [{ name: `${label} File`, extensions: [extension] }],
            });
            if (!savePath) return { cancelled: true };
            if (!savePath.toLowerCase().endsWith(`.${extension}`)) {
                savePath = `${savePath}.${extension}`;
            }
            const bytes = await ensureUint8Array(content, mimeType);
            await fs.writeBinaryFile({ path: savePath, contents: bytes });
            const savedName = basename(savePath) || suggestedName;
            helpers.recordRecent({
                name: savedName,
                path: savePath,
                type: docType,
                extension,
                lastAction: "save",
                timestamp,
                metadata,
            });
            return { path: savePath, name: savedName };
        }

        if (supportsFilePicker()) {
            const result = await saveWithFilePicker({
                blob,
                suggestedName,
                description: `${label} Document`,
                extension,
                mimeType,
            });
            if (!result) return { cancelled: true };
            const savedName = ensureExtension(result.name, extension);
            helpers.recordRecent({
                name: savedName,
                path: null,
                type: docType,
                extension,
                lastAction: "save",
                timestamp,
                metadata,
            });
            return { path: null, name: savedName };
        }

        downloadViaAnchor(blob, suggestedName);
        helpers.recordRecent({
            name: suggestedName,
            path: null,
            type: docType,
            extension,
            lastAction: "save",
            timestamp,
            metadata,
        });
        return { path: null, name: suggestedName };
    };

    // Load/open document helper: opens a saved .billproj file and navigates to appropriate page
    helpers.loadDocument = async function (fileSource, metadata = {}) {
        try {
            let content;
            let fileName = metadata?.name || "document.billproj";

            // Handle different file sources
            if (typeof fileSource === "string") {
                // It's file content as string
                content = fileSource;
            } else if (fileSource instanceof Blob || fileSource instanceof File) {
                // It's a File or Blob
                fileName = fileSource.name || fileName;
                const text = await fileSource.text();
                content = text;
            } else if (fileSource instanceof ArrayBuffer || fileSource instanceof Uint8Array) {
                // Binary data - convert to text
                const decoder = new TextDecoder();
                const bytes = fileSource instanceof ArrayBuffer ? new Uint8Array(fileSource) : fileSource;
                content = decoder.decode(bytes);
            } else if (metadata?.path && window.__TAURI__?.fs?.readTextFile) {
                // Tauri: read from file path
                const { fs } = window.__TAURI__;
                content = await fs.readTextFile(metadata.path);
            } else {
                throw new Error("Invalid file source");
            }

            // Parse JSON envelope
            const envelope = JSON.parse(content);
            const docType = envelope?.type || "invoice";
            const data = envelope?.data || envelope;

            // Navigate to the appropriate page with data
            const pageMap = {
                invoice: "invoice.html",
                receipt: "receipt.html",
                waybill: "waybill.html",
            };
            const targetPage = pageMap[docType] || "invoice.html";

            // Store the data in sessionStorage for the target page to read
            try {
                window.sessionStorage?.setItem("billingapp.openDocument", JSON.stringify({
                    type: docType,
                    data: data,
                    fileName: fileName,
                    timestamp: Date.now(),
                }));
            } catch (error) {
                console.warn("Failed to store document in sessionStorage", error);
            }

            // Navigate to the page
            window.location.href = targetPage;

            return { success: true, type: docType, fileName };
        } catch (error) {
            console.error("Failed to load document", error);
            throw error;
        }
    };

    // Export project helper: requests a .billproj archive from the backend
    helpers.exportProject = async function () {
        const apiBase = (window.BILLING_APP_CONFIG && window.BILLING_APP_CONFIG.apiBaseUrl) || (window.location && window.location.origin) || "";
        if (!apiBase) throw new Error("API base URL not available");

        const resp = await fetch(`${apiBase}/api/project/export/`, { method: "POST" });
        if (!resp.ok) throw new Error(`Export failed: ${resp.status}`);
        const arrayBuffer = await resp.arrayBuffer();

        const disposition = resp.headers.get("Content-Disposition") || "";
        const extension = "billproj";
        let filename = `BillingApp-${new Date().toISOString().replace(/[.:]/g, "-")}`;
        const match = disposition.match(/filename\*?=(?:UTF-8''|\")?([^;\"]+)/i);
        if (match && match[1]) {
            try {
                filename = decodeURIComponent(match[1].replace(/\"/g, ""));
            } catch (error) {
                filename = match[1].replace(/\"/g, "");
            }
        }
        const suggestedName = ensureExtension(filename, extension);
        const mimeType = "application/x-billing-project";
        const blob = new Blob([arrayBuffer], { type: mimeType });
        const timestamp = Date.now();

        if (window.__TAURI__?.dialog?.save && window.__TAURI__?.fs?.writeBinaryFile) {
            const { dialog, fs } = window.__TAURI__;
            let savePath = await dialog.save({
                defaultPath: suggestedName,
                filters: [{ name: "Billing Project", extensions: [extension] }],
            });
            if (!savePath) return { cancelled: true };
            if (!savePath.toLowerCase().endsWith(`.${extension}`)) {
                savePath = `${savePath}.${extension}`;
            }
            const contents = await ensureUint8Array(arrayBuffer, mimeType);
            await fs.writeBinaryFile({ path: savePath, contents });
            const savedName = basename(savePath) || suggestedName;
            helpers.recordRecent({
                name: savedName,
                path: savePath,
                type: "project",
                extension,
                lastAction: "export",
                timestamp,
            });
            return { path: savePath, name: savedName };
        }

        if (supportsFilePicker()) {
            const result = await saveWithFilePicker({
                blob,
                suggestedName,
                description: "Billing Project",
                extension,
                mimeType,
            });
            if (!result) return { cancelled: true };
            const savedName = ensureExtension(result.name, extension);
            helpers.recordRecent({
                name: savedName,
                path: null,
                type: "project",
                extension,
                lastAction: "export",
                timestamp,
            });
            return { path: null, name: savedName };
        }

        downloadViaAnchor(blob, suggestedName);
        helpers.recordRecent({
            name: suggestedName,
            path: null,
            type: "project",
            extension,
            lastAction: "export",
            timestamp,
        });
        return { path: null, name: suggestedName };
    };

    window.BillingApp = helpers;
    // Expose helpers globally
})();
