(function () {
    function onReady(fn) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
        else fn();
    }

    const STORAGE_KEY = 'billingapp:drafts.v1';

    function readDrafts() {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            return JSON.parse(raw);
        } catch (e) {
            console.warn('Failed to read drafts', e);
            return [];
        }
    }

    function writeDrafts(list) {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
            window.dispatchEvent(new CustomEvent('billingapp:drafts-changed', { detail: list }));
        } catch (e) {
            console.warn('Failed to write drafts', e);
        }
    }

    function generateId() {
        return `d_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }

    async function saveDraft(type, payload, metadata = {}, existingId = null) {
        if (!type || !payload) throw new Error('type and payload required');
        const list = readDrafts();
        let now = Date.now();
        if (existingId) {
            const idx = list.findIndex((d) => d.id === existingId);
            if (idx >= 0) {
                list[idx].payload = payload;
                list[idx].metadata = Object.assign({}, list[idx].metadata || {}, metadata || {});
                list[idx].updated_at = now;
                writeDrafts(list);
                return { id: existingId, updated: true };
            }
        }
        const id = generateId();
        const entry = {
            id,
            doc_type: type,
            payload,
            metadata: metadata || {},
            created_at: now,
            updated_at: now,
            storage: 'localStorage',
            storage_key: STORAGE_KEY,
        };
        list.unshift(entry);
        writeDrafts(list);
        return { id, created: true };
    }

    function getDrafts() {
        return readDrafts();
    }

    function getDraft(id) {
        if (!id) return null;
        const list = readDrafts();
        return list.find((d) => d.id === id) || null;
    }

    function deleteDraft(id) {
        if (!id) return false;
        const list = readDrafts();
        const next = list.filter((d) => d.id !== id);
        writeDrafts(next);
        return true;
    }

    function openDraft(id) {
        const draft = getDraft(id);
        if (!draft) throw new Error('Draft not found');
        const pageMap = { invoice: 'invoice.html', receipt: 'receipt.html', waybill: 'waybill.html' };
        const target = pageMap[draft.doc_type] || 'invoice.html';
        try {
            window.sessionStorage.setItem('billingapp.openDocument', JSON.stringify({ type: draft.doc_type, data: draft.payload, draftId: draft.id }));
        } catch (e) { /* ignore */ }
        window.location.href = target;
    }

    function renderDraftsList(containerId = 'drafts-list', emptyId = 'drafts-empty') {
        const listEl = document.getElementById(containerId);
        const emptyEl = document.getElementById(emptyId);
        if (!listEl || !emptyEl) return;
        let drafts = getDrafts();
        listEl.innerHTML = '';
        if (!drafts.length) {
            listEl.hidden = true;
            emptyEl.hidden = false;
            return;
        }
        // Apply search filter and sort based on the controls in the page
        try {
            const searchEl = document.getElementById('recent-search');
            const query = (searchEl && (searchEl.value || '').trim().toLowerCase()) || '';
            if (query) {
                drafts = drafts.filter((d) => {
                    const md = d.metadata || {};
                    const dateStr = d.updated_at ? new Date(d.updated_at).toLocaleString() : (d.created_at ? new Date(d.created_at).toLocaleString() : '');
                    const parts = [
                        (md.customer || '').toString(),
                        (md.title || '').toString(),
                        (md.bill_number || md.number || '').toString(),
                        (d.doc_type || '').toString(),
                        (d.storage_key || d.storage || '').toString(),
                        (d.path || '').toString(),
                        dateStr
                    ];
                    // include a metadata JSON dump too
                    const hay = parts.join(' ').toLowerCase() + ' ' + (d.metadata ? JSON.stringify(d.metadata).toLowerCase() : '');
                    return hay.includes(query);
                });
            }

            // determine sort order from either a native select or the sort menu
            let sortOrder = 'newest';
            const sel = document.getElementById('recent-sort');
            if (sel && sel.value) sortOrder = sel.value === 'oldest' ? 'oldest' : 'newest';
            else {
                const active = document.querySelector('#recent-sort-menu .sort-item.active');
                if (active && active.dataset && active.dataset.sort) sortOrder = active.dataset.sort === 'oldest' ? 'oldest' : 'newest';
            }

            drafts.sort((a, b) => {
                const ta = Number(a.updated_at || a.created_at || 0);
                const tb = Number(b.updated_at || b.created_at || 0);
                return sortOrder === 'oldest' ? ta - tb : tb - ta;
            });
        } catch (err) {
            // if anything fails, continue with unsorted list
            console.warn('Failed to apply drafts filters/sort', err);
        }
        emptyEl.hidden = true;
        listEl.hidden = false;
        drafts.forEach((d) => {
            const li = document.createElement('li');
            li.className = 'recent-project-item';
            li.setAttribute('data-draft-id', d.id);
            li.style.cursor = 'pointer';

            const nameWrap = document.createElement('p');
            nameWrap.className = 'recent-project-name';

            // Build a clear heading: Customer — Type [#Number]
            const nameText = document.createElement('span');
            nameText.className = 'recent-project-name-text';
            const md = d.metadata || {};
            const cust = md.customer || md.client || md.addressee || '';
            const billNum = md.bill_number || md.number || md.invoice_number || md.billNumber || '';
            const typeLabel = d.doc_type ? (d.doc_type.charAt(0).toUpperCase() + d.doc_type.slice(1)) : 'Draft';
            // Show customer name only in the customer column; fall back to title or generic label
            nameText.textContent = cust || md.title || `${typeLabel} draft`;

            const typeBadge = document.createElement('span');
            typeBadge.className = `recent-project-type recent-project-type--${d.doc_type}`;
            typeBadge.textContent = typeLabel;
            nameWrap.append(nameText, typeBadge);

            const metaEl = document.createElement('div');
            metaEl.className = 'recent-project-meta';

            const dateCol = document.createElement('span');
            dateCol.className = 'col col-date';
            dateCol.textContent = new Date(d.updated_at).toLocaleString();

            const numberCol = document.createElement('span');
            numberCol.className = 'col col-number';
            numberCol.textContent = d.metadata?.bill_number || d.metadata?.number || d.metadata?.invoice_number || '';

            const storageCol = document.createElement('span');
            storageCol.className = 'col col-storage';
            // show location value (for drafts we show storage type/key)
            storageCol.textContent = d.storage_key ? `${d.storage} (${d.storage_key})` : d.storage || '';

            // customer is displayed in the heading column; append other cols in order
            metaEl.appendChild(dateCol);
            metaEl.appendChild(numberCol);
            metaEl.appendChild(storageCol);

            li.addEventListener('dblclick', () => {
                try {
                    openDraft(d.id);
                } catch (e) {
                    console.error(e);
                    alert('Could not open draft');
                }
            });

            // single-click selects and shows actions (delete/export)
            li.addEventListener('click', (ev) => {
                document.querySelectorAll('#drafts-list .recent-project-item.selected').forEach((n) => n.classList.remove('selected'));
                li.classList.add('selected');
            });

            // Build grid columns: name (with badge) + meta cols
            const colName = document.createElement('div');
            colName.className = 'col col-customer';
            colName.appendChild(nameWrap);

            const colType = document.createElement('div');
            colType.className = 'col col-type';
            colType.appendChild(typeBadge);

            const colDate = document.createElement('div');
            colDate.className = 'col col-date';
            colDate.appendChild(dateCol);

            const colNumber = document.createElement('div');
            colNumber.className = 'col col-number';
            colNumber.appendChild(numberCol);

            const colStorage = document.createElement('div');
            colStorage.className = 'col col-storage';
            colStorage.appendChild(storageCol);

            li.appendChild(colName);
            li.appendChild(colType);
            li.appendChild(colDate);
            li.appendChild(colNumber);
            li.appendChild(colStorage);

            listEl.appendChild(li);
        });
    }

    onReady(() => {
        // expose API
        window.Drafts = {
            saveDraft,
            getDrafts,
            getDraft,
            deleteDraft,
            openDraft,
            renderDraftsList,
            STORAGE_KEY,
        };

        // wire up home tab buttons if present
        const tabRecents = document.getElementById('home-tab-recents');
        const tabDrafts = document.getElementById('home-tab-drafts');
        const recentsPanel = document.getElementById('recents-panel');
        const draftsPanel = document.getElementById('drafts-panel');
        if (tabRecents && tabDrafts && recentsPanel && draftsPanel) {
            tabRecents.addEventListener('click', () => {
                tabRecents.classList.add('button-primary');
                tabDrafts.classList.remove('button-primary');
                recentsPanel.hidden = false;
                draftsPanel.hidden = true;
            });
            tabDrafts.addEventListener('click', () => {
                tabDrafts.classList.add('button-primary');
                tabRecents.classList.remove('button-primary');
                recentsPanel.hidden = true;
                draftsPanel.hidden = false;
                renderDraftsList();
            });
        }

        // render on drafts-changed
        window.addEventListener('billingapp:drafts-changed', (ev) => {
            try { renderDraftsList(); } catch (e) { /* ignore */ }
        });

        // Re-render drafts when the search input changes (so drafts respect the search)
        const searchInput = document.getElementById('recent-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const draftsPanel = document.getElementById('drafts-panel');
                if (draftsPanel && !draftsPanel.hidden) renderDraftsList();
            });
        }

        // Re-render drafts when sort selection changes in the sort menu
        const sortMenu = document.getElementById('recent-sort-menu');
        if (sortMenu) {
            sortMenu.addEventListener('click', () => {
                const draftsPanel = document.getElementById('drafts-panel');
                if (draftsPanel && !draftsPanel.hidden) setTimeout(() => renderDraftsList(), 0);
            });
        }

        // initial render if on home and drafts panel visible
        try {
            if (document.getElementById('drafts-panel') && !document.getElementById('drafts-panel').hidden) renderDraftsList();
        } catch (e) { /* ignore */ }
    });
})();
