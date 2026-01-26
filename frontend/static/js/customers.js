/* Lightweight customer name store + datalist autocomplete
   - Persists a small list of recent customer names in localStorage
   - Exposes window.Customers.add(name) and .list()
   - Automatically wires a <datalist id="billing-recent-customers"> and attaches it to common customer inputs
*/
(function () {
    const STORAGE_KEY = 'billing:customers.v1';
    const MAX_ITEMS = 100;
    const DATALIST_ID = 'billing-recent-customers';

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed;
        } catch (e) {
            return [];
        }
    }

    function save(list) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
        } catch (e) { /* ignore */ }
    }

    function normalize(name) {
        if (!name) return '';
        return String(name).trim();
    }

    function add(name) {
        const n = normalize(name);
        if (!n) return;
        const list = load();
        // remove existing duplicate (case-insensitive)
        const idx = list.findIndex((x) => x.toLowerCase() === n.toLowerCase());
        if (idx !== -1) list.splice(idx, 1);
        list.unshift(n);
        save(list);
        updateDatalist(list);
    }

    function remove(name) {
        const n = normalize(name);
        if (!n) return;
        const list = load();
        const idx = list.findIndex((x) => x.toLowerCase() === n.toLowerCase());
        if (idx !== -1) {
            list.splice(idx, 1);
            save(list);
            updateDatalist(list);
        }
    }

    function update(oldName, newName) {
        const o = normalize(oldName);
        const n = normalize(newName);
        if (!o || !n) return;
        const list = load();
        const idx = list.findIndex((x) => x.toLowerCase() === o.toLowerCase());
        if (idx !== -1) list.splice(idx, 1);
        // remove any duplicate newName
        const dup = list.findIndex((x) => x.toLowerCase() === n.toLowerCase());
        if (dup !== -1) list.splice(dup, 1);
        list.unshift(n);
        save(list);
        updateDatalist(list);
    }

    function list() {
        return load();
    }

    function findDocs(customerName) {
        const name = normalize(customerName || '');
        if (!name) return [];
        try {
            const draftsApi = window.Drafts && typeof window.Drafts.getDrafts === 'function' ? window.Drafts.getDrafts() : [];
            const lower = name.toLowerCase();
            return draftsApi.filter((d) => {
                const md = d && d.metadata ? d.metadata : {};
                const cust = (md.customer || md.client || md.customer_name || '').toString().toLowerCase();
                return cust === lower;
            });
        } catch (e) {
            return [];
        }
    }

    function ensureDatalist() {
        let dl = document.getElementById(DATALIST_ID);
        if (!dl) {
            dl = document.createElement('datalist');
            dl.id = DATALIST_ID;
            document.body.appendChild(dl);
        }
        return dl;
    }

    function updateDatalist(items) {
        const dl = ensureDatalist();
        dl.innerHTML = '';
        (items || load()).forEach((name) => {
            const opt = document.createElement('option');
            opt.value = name;
            dl.appendChild(opt);
        });
    }

    function attachToInput(input) {
        if (!input || !input.setAttribute) return;
        input.setAttribute('list', DATALIST_ID);
        input.addEventListener('change', () => {
            // Save on change (select from list or typed)
            const v = String(input.value || '').trim();
            if (v) add(v);
        });
        input.addEventListener('blur', () => {
            const v = String(input.value || '').trim();
            if (v) add(v);
        });
    }

    // Auto-attach to common inputs on DOM ready
    function autoAttach() {
        const ids = ['invoice-customer', 'receipt-customer-name', 'waybill-customer'];
        ids.forEach((id) => {
            const el = document.getElementById(id);
            if (el) attachToInput(el);
        });
        // initial populate datalist
        updateDatalist(load());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoAttach, { once: true });
    } else {
        autoAttach();
    }

    window.Customers = {
        add,
        list,
        findDocs,
        attach: attachToInput,
        remove,
        update
    };

})();
