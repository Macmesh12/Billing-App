// Simple settings popover logic
(function(){
  const toggle = document.getElementById('nav-settings-toggle');
  const pop = document.getElementById('nav-settings-pop');
  const overlay = document.getElementById('nav-settings-overlay');
  const saveBtn = document.getElementById('settings-save-btn');
  const savePdfNow = document.getElementById('settings-save-pdf-now');
  const draftPath = document.getElementById('settings-draft-path');
  const pdfPath = document.getElementById('settings-pdf-path');
  const savePdfCheckbox = document.getElementById('settings-save-pdf');
  const closeBtn = document.getElementById('settings-close');
  const choosePdfBtn = document.getElementById('settings-choose-pdf');
  const chooserPdf = document.getElementById('settings-pdf-chooser');
  const chooseDraftBtn = document.getElementById('settings-choose-draft');
  const chooserDraft = document.getElementById('settings-draft-chooser');
  const customersListEl = document.getElementById('settings-customers-list');
  const customerAddInput = document.getElementById('settings-customer-add-input');
  const customerAddBtn = document.getElementById('settings-customer-add');
  const clearDataBtn = document.getElementById('settings-clear-data-btn');

  function load() {
    try {
      const path = localStorage.getItem('billing:draftPath') || '';
      const pdf = localStorage.getItem('billing:pdfPath') || '';
      const savePdf = localStorage.getItem('billing:savePdfOnSave') === 'true';
      if (draftPath) draftPath.value = path;
      if (pdfPath) pdfPath.value = pdf;
      if (savePdfCheckbox) savePdfCheckbox.checked = savePdf;
      renderCustomers();
    } catch(e){/* ignore */}
  }

  function save() {
    try {
      if (draftPath) localStorage.setItem('billing:draftPath', draftPath.value || '');
      if (pdfPath) localStorage.setItem('billing:pdfPath', pdfPath.value || '');
      if (savePdfCheckbox) localStorage.setItem('billing:savePdfOnSave', savePdfCheckbox.checked ? 'true' : 'false');
      showToast('Settings saved');
      closePop();
    } catch(e){ console.error(e); }
  }

  function showToast(msg){
    const t = document.createElement('div');
    t.className = 'module-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(()=>{ t.classList.add('is-hidden'); t.remove(); }, 1800);
  }

  function openPop(){
    if (!pop) return;
    pop.hidden = false;
    if (overlay) overlay.hidden = false;
    toggle.setAttribute('aria-expanded','true');
    // Only add body.settings-open when no overlay wrapper is used
    if (!overlay) document.body.classList.add('settings-open');
    document.addEventListener('click', outsideListener);
    // focus first input
    setTimeout(()=>{ if (customerAddInput) customerAddInput.focus(); }, 120);
  }
  function closePop(){
    if (!pop) return;
    pop.hidden = true;
    if (overlay) overlay.hidden = true;
    toggle.setAttribute('aria-expanded','false');
    if (!overlay) document.body.classList.remove('settings-open');
    document.removeEventListener('click', outsideListener);
  }
  function outsideListener(e){
    if (!pop) return;
    if (!pop.contains(e.target) && e.target !== toggle) closePop();
  }

  function renderCustomers(){
    if (!customersListEl) return;
    customersListEl.innerHTML = '';
    const list = (window.Customers && typeof window.Customers.list === 'function') ? window.Customers.list() : [];
    if (!list || list.length === 0) {
      const p = document.createElement('p'); p.className = 'empty-state'; p.textContent = 'No saved customers'; customersListEl.appendChild(p); return;
    }
    const ul = document.createElement('ul'); ul.className = 'settings-customers';
    list.forEach((name)=>{
      const li = document.createElement('li'); li.className = 'settings-customer-item';
      const span = document.createElement('span'); span.textContent = name; span.className = 'settings-customer-name';
      const btnEdit = document.createElement('button'); btnEdit.className = 'button-secondary'; btnEdit.type='button'; btnEdit.textContent = 'Edit';
      const btnDel = document.createElement('button'); btnDel.className = 'button-secondary'; btnDel.type='button'; btnDel.textContent = 'Delete';
      btnEdit.addEventListener('click', ()=>{
        const nv = window.prompt('Rename customer', name);
        if (nv && nv.trim() && nv.trim() !== name) {
          try { window.Customers.update(name, nv.trim()); renderCustomers(); showToast('Customer updated'); } catch(e){console.error(e)}
        }
      });
      btnDel.addEventListener('click', ()=>{
        if (!window.confirm(`Delete customer "${name}" from saved list? This will not delete existing drafts.`)) return;
        try { window.Customers.remove(name); renderCustomers(); showToast('Customer removed'); } catch(e){console.error(e)}
      });
      li.appendChild(span);
      const actions = document.createElement('div'); actions.style.display='inline-flex'; actions.style.gap='0.4rem'; actions.style.marginLeft='0.6rem';
      actions.appendChild(btnEdit); actions.appendChild(btnDel);
      li.appendChild(actions);
      ul.appendChild(li);
    });
    customersListEl.appendChild(ul);
  }

  function addCustomerFromInput(){
    if (!customerAddInput) return;
    const v = (customerAddInput.value || '').trim();
    if (!v) return showToast('Enter a customer name');
    if (window.Customers && typeof window.Customers.add === 'function') window.Customers.add(v);
    customerAddInput.value = '';
    renderCustomers();
    showToast('Customer added');
  }

  function clearData(){
    if (!window.confirm('Clear all saved data (customers, drafts and settings)? This cannot be undone.')) return;
    try {
      localStorage.removeItem('billing:customers.v1');
      localStorage.removeItem('billingapp:drafts.v1');
      localStorage.removeItem('billing:draftPath');
      localStorage.removeItem('billing:pdfPath');
      localStorage.removeItem('billing:savePdfOnSave');
      // notify other modules
      window.dispatchEvent(new CustomEvent('billingapp:drafts-changed'));
      window.dispatchEvent(new CustomEvent('customers:changed'));
      renderCustomers();
      showToast('Cleared saved data');
    } catch(e){ console.error(e); }
  }

  if (toggle){
    toggle.addEventListener('click', (e)=>{
      e.stopPropagation();
      if (!pop || pop.hidden) { load(); openPop(); } else closePop();
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', (e)=>{ e.stopPropagation(); closePop(); });

  if (overlay) {
    overlay.addEventListener('click', (e)=>{ if (e.target === overlay) closePop(); });
  }

  if (choosePdfBtn && chooserPdf) {
    choosePdfBtn.addEventListener('click', (e)=>{ e.preventDefault(); chooserPdf.click(); });
  }
  if (chooserPdf) {
    chooserPdf.addEventListener('change', (e)=>{
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const first = files[0];
      const rel = first.webkitRelativePath || first.name || '';
      const folder = rel.split('/')[0] || '';
      if (pdfPath) pdfPath.value = folder;
    });
  }

  if (chooseDraftBtn && chooserDraft) {
    chooseDraftBtn.addEventListener('click', (e)=>{ e.preventDefault(); chooserDraft.click(); });
  }
  if (chooserDraft) {
    chooserDraft.addEventListener('change', (e)=>{
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const first = files[0];
      const rel = first.webkitRelativePath || first.name || '';
      const folder = rel.split('/')[0] || '';
      if (draftPath) draftPath.value = folder;
    });
  }

  if (saveBtn) saveBtn.addEventListener('click', save);
  if (savePdfNow) savePdfNow.addEventListener('click', ()=>{
    const ev = new CustomEvent('settings:savePdfNow', { detail: { draftPath: draftPath ? draftPath.value : '', pdfPath: pdfPath ? pdfPath.value : '', savePdfOnSave: savePdfCheckbox ? savePdfCheckbox.checked : false } });
    window.dispatchEvent(ev);
    showToast('Save PDF requested');
  });

  if (customerAddBtn) customerAddBtn.addEventListener('click', addCustomerFromInput);
  if (customerAddInput) customerAddInput.addEventListener('keydown', (e)=>{ if (e.key === 'Enter') addCustomerFromInput(); });
  if (clearDataBtn) clearDataBtn.addEventListener('click', clearData);

  // close with ESC
  document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closePop(); });
})();
