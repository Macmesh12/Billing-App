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
            // apply transform; keep transform-origin at top center so page scales uniformly
            workspace.style.transform = `scale(${clamped})`;
            workspace.style.transformOrigin = 'top center';
            // ensure the parent can scroll when scaled
            const parent = workspace.parentElement;
            if (parent) parent.style.overflow = 'auto';
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
    // Export project helper: requests a .billproj archive from the backend
    helpers.exportProject = async function () {
        const apiBase = (window.BILLING_APP_CONFIG && window.BILLING_APP_CONFIG.apiBaseUrl) || (window.location && window.location.origin) || "";
        if (!apiBase) throw new Error("API base URL not available");

        const resp = await fetch(`${apiBase}/api/project/export/`, { method: "POST" });
        if (!resp.ok) throw new Error(`Export failed: ${resp.status}`);
        const arrayBuffer = await resp.arrayBuffer();

        // determine filename from Content-Disposition or fallback
        const disposition = resp.headers.get("Content-Disposition") || "";
        let filename = "BillingApp-" + new Date().toISOString().replace(/[.:]/g, "-") + ".billproj";
        const m = disposition.match(/filename\*?=(?:UTF-8''|\")?([^;\"]+)/i);
        if (m && m[1]) {
            try { filename = decodeURIComponent(m[1].replace(/\"/g, "")); } catch (e) { filename = m[1].replace(/\"/g, ""); }
        }

        // Tauri: use native dialog & fs if available
        if (window.__TAURI__ && window.__TAURI__.dialog && window.__TAURI__.fs && typeof window.__TAURI__.fs.writeBinaryFile === 'function') {
            const { dialog, fs } = window.__TAURI__;
            const savePath = await dialog.save({ defaultPath: filename, filters: [{ name: 'Billing Project', extensions: ['billproj'] }] });
            if (!savePath) return { cancelled: true };
            await fs.writeBinaryFile({ path: savePath, contents: new Uint8Array(arrayBuffer) });
            return { path: savePath, name: filename };
        }

        // Browser fallback: download blob
        const blob = new Blob([arrayBuffer], { type: 'application/x-billing-project' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return { path: null, name: filename };
    };

    window.BillingApp = helpers;
    // Expose helpers globally
})();
