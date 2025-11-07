(() => {
    const RECENT_STORAGE_KEY = "billingapp.recentProjects";
    const state = {
        recents: [],
        isBusy: false,
        elements: {},
    };

    const isTauri = Boolean(window.__TAURI__);

    const getApiBase = () => {
        if (window.DJANGO_PORT) {
            return `http://127.0.0.1:${window.DJANGO_PORT}`;
        }
        const config = window.BILLING_APP_CONFIG || {};
        if (typeof config.apiBaseUrl === "string" && config.apiBaseUrl.length > 0) {
            return config.apiBaseUrl;
        }
        if (window.location && window.location.origin) {
            return window.location.origin;
        }
        return "";
    };

    const setStatus = (message, tone = "info") => {
        const statusEl = state.elements.status;
        if (!statusEl) return;
        statusEl.textContent = message || "";
        statusEl.classList.remove("is-success", "is-error");
        if (tone === "success") {
            statusEl.classList.add("is-success");
        } else if (tone === "error") {
            statusEl.classList.add("is-error");
        }
    };

    const setBusy = (flag) => {
        state.isBusy = flag;
        const { exportBtn, importBtn } = state.elements;
        [exportBtn, importBtn].forEach((btn) => {
            if (!btn) return;
            if (flag) {
                btn.setAttribute("disabled", "disabled");
                btn.setAttribute("aria-busy", "true");
            } else {
                btn.removeAttribute("disabled");
                btn.removeAttribute("aria-busy");
            }
        });
    };

    const loadRecents = () => {
        try {
            const raw = window.localStorage?.getItem(RECENT_STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn("Failed to load recent projects", error);
            return [];
        }
    };

    const saveRecents = () => {
        try {
            window.localStorage?.setItem(RECENT_STORAGE_KEY, JSON.stringify(state.recents));
        } catch (error) {
            console.warn("Failed to persist recent projects", error);
        }
    };

    const formatTimestamp = (timestamp) => {
        try {
            return new Date(timestamp).toLocaleString();
        } catch (error) {
            return "";
        }
    };

    const renderRecents = () => {
        const listEl = state.elements.recentsList;
        const emptyEl = state.elements.recentsEmpty;
        if (!listEl || !emptyEl) return;

        listEl.innerHTML = "";
        if (!state.recents.length) {
            listEl.hidden = true;
            emptyEl.hidden = false;
            return;
        }

        emptyEl.hidden = true;
        listEl.hidden = false;

        state.recents.forEach((entry) => {
            const li = document.createElement("li");
            li.className = "recent-project-item";

            const nameEl = document.createElement("p");
            nameEl.className = "recent-project-name";
            nameEl.textContent = entry.name || "Untitled project";

            const metaEl = document.createElement("p");
            metaEl.className = "recent-project-meta";

            const actionSpan = document.createElement("span");
            actionSpan.textContent = `${entry.lastAction === "export" ? "Saved" : "Opened"} ${formatTimestamp(entry.timestamp)}`;
            metaEl.appendChild(actionSpan);

            if (entry.path) {
                const pathSpan = document.createElement("span");
                pathSpan.textContent = entry.path;
                metaEl.appendChild(pathSpan);
            }

            li.append(nameEl, metaEl);
            listEl.appendChild(li);
        });
    };

    const rememberProject = (entry) => {
        const key = entry.path || entry.name;
        const index = state.recents.findIndex((item) => (item.path || item.name) === key);
        if (index >= 0) {
            state.recents.splice(index, 1);
        }
        state.recents.unshift(entry);
        state.recents = state.recents.slice(0, 5);
        saveRecents();
        renderRecents();
    };

    const extractFilename = (disposition) => {
        if (!disposition) return "";
        const match = disposition.match(/filename\*?=([^;]+)/i);
        if (!match) return "";
        const value = match[1].trim().replace(/^UTF-8''/i, "");
        try {
            return decodeURIComponent(value.replace(/"/g, ""));
        } catch (error) {
            return value.replace(/"/g, "");
        }
    };

    const downloadBlob = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    };

    const exportProject = async () => {
        if (state.isBusy) return;
        const apiBase = getApiBase();
        if (!apiBase) {
            setStatus("API endpoint unavailable.", "error");
            return;
        }

        try {
            setBusy(true);
            setStatus("Preparing project archive…");
            const response = await fetch(`${apiBase}/api/project/export/`, { method: "POST" });
            if (!response.ok) {
                throw new Error(`Export failed with status ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const disposition = response.headers.get("Content-Disposition") || "";
            const fallbackName = `BillingApp-${new Date().toISOString().replace(/[.:]/g, "-")}.billproj`;
            const filename = extractFilename(disposition) || fallbackName;

            if (isTauri && window.__TAURI__?.dialog && window.__TAURI__?.fs?.writeBinaryFile) {
                const { dialog, fs } = window.__TAURI__;
                const savePath = await dialog.save({
                    defaultPath: filename,
                    filters: [{ name: "Billing Project", extensions: ["billproj"] }],
                });
                if (!savePath) {
                    setStatus("Save cancelled.");
                    return;
                }
                await fs.writeBinaryFile({ path: savePath, contents: new Uint8Array(arrayBuffer) });
                setStatus(`Saved project to ${savePath}`, "success");
                rememberProject({
                    name: filename,
                    path: savePath,
                    lastAction: "export",
                    timestamp: Date.now(),
                });
            } else {
                const blob = new Blob([arrayBuffer], { type: "application/x-billing-project" });
                downloadBlob(blob, filename);
                setStatus("Project archive downloaded.", "success");
                rememberProject({
                    name: filename,
                    path: null,
                    lastAction: "export",
                    timestamp: Date.now(),
                });
            }
        } catch (error) {
            console.error(error);
            setStatus("Failed to export project.", "error");
        } finally {
            setBusy(false);
        }
    };

    const formatSummary = (summary) => {
        if (!summary) return "Project imported.";
        const parts = [];
        if (typeof summary.invoices === "number") parts.push(`${summary.invoices} invoice${summary.invoices === 1 ? "" : "s"}`);
        if (typeof summary.receipts === "number") parts.push(`${summary.receipts} receipt${summary.receipts === 1 ? "" : "s"}`);
        if (typeof summary.waybills === "number") parts.push(`${summary.waybills} waybill${summary.waybills === 1 ? "" : "s"}`);
        if (typeof summary.assets === "number") parts.push(`${summary.assets} asset${summary.assets === 1 ? "" : "s"}`);
        return `Imported ${parts.join(", ")}.`;
    };

    const importArchive = async (binarySource, meta) => {
        const apiBase = getApiBase();
        if (!apiBase) {
            setStatus("API endpoint unavailable.", "error");
            return;
        }

        try {
            setBusy(true);
            setStatus("Importing project…");
            const body = binarySource instanceof Uint8Array ? binarySource : new Uint8Array(binarySource);
            const response = await fetch(`${apiBase}/api/project/import/`, {
                method: "POST",
                headers: { "Content-Type": "application/octet-stream" },
                body,
            });
            if (!response.ok) {
                const errorPayload = await response.json().catch(() => ({}));
                const message = errorPayload?.error || "Import failed.";
                throw new Error(message);
            }

            const payload = await response.json();
            setStatus(formatSummary(payload?.summary), "success");
            rememberProject({
                name: meta?.name || "Imported project",
                path: meta?.path || null,
                lastAction: "import",
                timestamp: Date.now(),
            });
            loadCounts();
        } catch (error) {
            console.error(error);
            setStatus(error.message || "Failed to import project.", "error");
        } finally {
            setBusy(false);
        }
    };

    const importFromBrowserFile = async (file) => {
        if (!file) return;
        const buffer = await file.arrayBuffer();
        await importArchive(buffer, { name: file.name, path: null });
    };

    const importViaTauri = async () => {
        const { dialog, fs } = window.__TAURI__ || {};
        if (!dialog || !fs) {
            setStatus("File dialog unavailable.", "error");
            return;
        }
        const selection = await dialog.open({
            multiple: false,
            filters: [{ name: "Billing Project", extensions: ["billproj"] }],
        });
        if (!selection) {
            setStatus("Import cancelled.");
            return;
        }
        const filePath = Array.isArray(selection) ? selection[0] : selection;
        const contents = await fs.readBinaryFile(filePath);
        const name = filePath.split(/[\\/]/).pop() || "Imported project";
        await importArchive(contents, { name, path: filePath });
    };

    const handleImportClick = () => {
        if (state.isBusy) return;
        if (isTauri && window.__TAURI__?.dialog) {
            importViaTauri();
            return;
        }
        state.elements.importInput?.click();
    };

    const clearRecents = () => {
        state.recents = [];
        saveRecents();
        renderRecents();
        setStatus("Recent projects cleared.");
    };

    const loadCounts = async () => {
        const apiBase = getApiBase();
        const { invoicesCount, receiptsCount, waybillsCount } = state.elements;
        if (!apiBase) {
            [invoicesCount, receiptsCount, waybillsCount].forEach((el) => {
                if (el) el.textContent = "0";
            });
            return;
        }
        try {
            const response = await fetch(`${apiBase}/api/counter/counts/`);
            if (response.ok) {
                const counts = await response.json();
                animateCount(invoicesCount, counts.invoices || 0);
                animateCount(receiptsCount, counts.receipts || 0);
                animateCount(waybillsCount, counts.waybills || 0);
            }
        } catch (error) {
            console.warn("Failed to load document counts", error);
            [invoicesCount, receiptsCount, waybillsCount].forEach((el) => {
                if (el) el.textContent = "0";
            });
        }
    };

    const animateCount = (element, target) => {
        if (!element) return;
        const duration = 800;
        const increment = target / (duration / 16);
        let current = 0;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.textContent = target.toLocaleString();
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current).toLocaleString();
            }
        }, 16);
    };

    document.addEventListener("DOMContentLoaded", () => {
        state.elements = {
            invoicesCount: document.getElementById("invoice-count"),
            receiptsCount: document.getElementById("receipt-count"),
            waybillsCount: document.getElementById("waybill-count"),
            exportBtn: document.getElementById("project-export"),
            importBtn: document.getElementById("project-import"),
            importInput: document.getElementById("project-import-input"),
            status: document.getElementById("project-status"),
            recentsList: document.getElementById("recent-projects-list"),
            recentsEmpty: document.getElementById("recent-projects-empty"),
            clearRecentsBtn: document.getElementById("recent-projects-clear"),
        };

        state.recents = loadRecents();
        renderRecents();

        state.elements.exportBtn?.addEventListener("click", exportProject);
        state.elements.importBtn?.addEventListener("click", handleImportClick);
        state.elements.clearRecentsBtn?.addEventListener("click", clearRecents);
        state.elements.importInput?.addEventListener("change", (event) => {
            const inputEl = event.target;
            if (!inputEl || !("files" in inputEl)) {
                return;
            }
            const file = inputEl.files?.[0];
            inputEl.value = "";
            if (file) {
                importFromBrowserFile(file);
            }
        });

        loadCounts();
    });
})();
