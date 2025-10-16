import { useState, useEffect, useCallback } from 'react';
import Layout from './Layout';
import '../styles/general.css';
import '../styles/waybill.css';
import { chooseDownloadFormat } from '../utils/formatChooser';

const API_BASE = 'http://127.0.0.1:8765';

const Waybill = () => {
  const [isPreview, setIsPreview] = useState(false);
  const [waybillNumber, setWaybillNumber] = useState('WB-NEW');
  const [isSaving, setIsSaving] = useState(false);
  
  // Form data
  const [issueDate, setIssueDate] = useState('');
  const [driver, setDriver] = useState('');
  const [receiver, setReceiver] = useState('');
  const [contact, setContact] = useState('DELIVERED BY SPAQUELS • CONTACT: 0540 673202 | 050 532 1475 | 030 273 8719');
  
  // Items state
  const [items, setItems] = useState([
    { description: '', quantity: 0, unit_price: 0, total: 0 }
  ]);
  
  // Toast state
  const [toast, setToast] = useState({ message: '', type: '', visible: false });

  const loadNextWaybillNumber = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/counter/waybill/next/`);
      if (response.ok) {
        const data = await response.json();
        setWaybillNumber(data.next_number || 'WB-NEW');
      }
    } catch (error) {
      console.warn('Failed to load next waybill number', error);
    }
  }, []);

  // Load next waybill number on mount
  useEffect(() => {
    loadNextWaybillNumber();
  }, [loadNextWaybillNumber]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Calculate total for the item
    if (field === 'quantity' || field === 'unit_price') {
      const qty = Number(newItems[index].quantity) || 0;
      const price = Number(newItems[index].unit_price) || 0;
      newItems[index].total = qty * price;
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    if (items.length >= 10) {
      showToast('Maximum 10 items allowed', 'error');
      return;
    }
    setItems([...items, { description: '', quantity: 0, unit_price: 0, total: 0 }]);
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const formatCurrency = (value) => {
    return Number(value || 0).toFixed(2);
  };

  const formatQuantity = (value) => {
    const numeric = Number.parseFloat(value || 0);
    if (!Number.isFinite(numeric)) return '0';
    return Number.isInteger(numeric) ? numeric.toString() : numeric.toFixed(2);
  };

  const formatDisplayDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast({ message: '', type: '', visible: false });
    }, 4000);
  };

  const togglePreview = () => {
    setIsPreview(!isPreview);
  };

  const buildPdfPayload = (format) => {
    const previewEl = document.getElementById('waybill-preview');
    if (!previewEl) {
      throw new Error('Preview element not found');
    }

    const clone = previewEl.cloneNode(true);
    clone.removeAttribute('hidden');
    clone.setAttribute('data-pdf-clone', 'true');
    clone.classList.add('pdf-export');

    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-export-wrapper';
    wrapper.appendChild(clone);

    const normalizedFormat = format === 'jpeg' ? 'jpeg' : 'pdf';
    const safeBase = String(waybillNumber || 'waybill').trim().replace(/\s+/g, '_');
    const extension = normalizedFormat === 'jpeg' ? 'jpg' : 'pdf';

    return {
      document_type: 'waybill',
      html: wrapper.outerHTML,
      filename: `${safeBase}.${extension}`,
      format: normalizedFormat,
    };
  };

  const downloadWaybill = async (format = 'pdf') => {
    try {
      const payload = buildPdfPayload(format);
      const normalizedFormat = payload.format === 'jpeg' ? 'jpeg' : 'pdf';

      const response = await fetch(`${API_BASE}/api/pdf/render/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: normalizedFormat === 'jpeg' ? 'image/jpeg' : 'application/pdf',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate document: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = payload.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download document error:', error);
      throw error;
    }
  };

  const incrementWaybillNumber = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/counter/waybill/next/`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setWaybillNumber(data.next_number || 'WB-NEW');
      }
    } catch (error) {
      console.warn('Failed to increment waybill number', error);
    }
  };

  const handleDownload = async () => {
    if (isSaving) return;

    const chosenFormat = await chooseDownloadFormat();
    if (!chosenFormat) {
      return;
    }

    setIsSaving(true);

    try {
      const normalizedFormat = chosenFormat === 'jpeg' ? 'jpeg' : 'pdf';
      await downloadWaybill(normalizedFormat);
      const label = normalizedFormat === 'jpeg' ? 'JPEG' : 'PDF';
      showToast(`Waybill downloaded as ${label}!`);
      await incrementWaybillNumber();
    } catch (error) {
      console.error('Failed to download waybill', error);
      showToast(error.message || 'Failed to download waybill', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Render 10 rows (fill empty ones)
  const renderTableRows = () => {
    const rows = [];
    for (let i = 0; i < 10; i++) {
      const item = items[i];
      if (item) {
        rows.push(
          <tr key={i}>
            <td>
              <input
                type="text"
                value={item.description}
                onChange={(e) => handleItemChange(i, 'description', e.target.value)}
                placeholder="Item description"
              />
            </td>
            <td>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => handleItemChange(i, 'quantity', e.target.value)}
                min="0"
                step="0.01"
              />
            </td>
            <td>
              <input
                type="number"
                value={item.unit_price}
                onChange={(e) => handleItemChange(i, 'unit_price', e.target.value)}
                min="0"
                step="0.01"
              />
            </td>
            <td className="row-total">{formatCurrency(item.total)}</td>
            <td>
              <button
                type="button"
                className="btn-remove-row"
                onClick={() => removeItem(i)}
                title="Remove this item"
              >
                ×
              </button>
            </td>
          </tr>
        );
      } else {
        rows.push(
          <tr key={i} className="empty-row">
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
          </tr>
        );
      }
    }
    return rows;
  };

  const renderPreviewRows = () => {
    const rows = [];
    for (let i = 0; i < 10; i++) {
      const item = items[i];
      if (item) {
        rows.push(
          <tr key={i}>
            <td>{item.description || ''}</td>
            <td>{formatQuantity(item.quantity || 0)}</td>
            <td>{formatCurrency(item.unit_price || 0)}</td>
            <td>{formatCurrency(item.total || 0)}</td>
          </tr>
        );
      } else {
        rows.push(
          <tr key={i} className="empty-row">
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
          </tr>
        );
      }
    }
    return rows;
  };

  return (
    <Layout>
      <main className="app-main">
        <section id="waybill-module" className="module" data-document-type="waybill">
          <div className="module-header">
            <h2>Waybill</h2>
            <div className="module-actions">
              <button
                id="waybill-preview-toggle"
                className="button button-secondary"
                type="button"
                onClick={togglePreview}
              >
                {isPreview ? 'Back to Edit' : 'Preview'}
              </button>
              <button
                id="waybill-submit"
                className="button"
                type="button"
                onClick={handleDownload}
                disabled={isSaving}
              >
                Download
              </button>
            </div>
          </div>

          <div className="module-body">
            {/* Edit Form */}
            <form
              id="waybill-form"
              className={`document waybill-document document-editable ${isPreview ? 'is-hidden' : ''}`}
              style={{ display: isPreview ? 'none' : 'block' }}
            >
              <div className="waybill-letterhead">
                <div className="letterhead-left">
                  <h3 className="title">WAYBILL</h3>
                  <p>No.: <span id="waybill-number">{waybillNumber}</span></p>
                  <p className="waybill-date">
                    Date:{' '}
                    <input
                      type="date"
                      id="waybill-issue-date"
                      name="issue_date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      required
                      style={{ display: 'inline', width: 'auto', border: 'none', background: 'transparent' }}
                    />
                  </p>
                </div>
                <div className="letterhead-right">
                  <img src="/assets/logo.png" alt="logo-placeholder" className="logo-placeholder" />
                </div>
              </div>

              <table className="document-items" id="waybill-items-table">
                <thead>
                  <tr>
                    <th className="description">Description</th>
                    <th>Qty</th>
                    <th>Unit Price (GHC)</th>
                    <th>Amount (GHC)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>{renderTableRows()}</tbody>
              </table>
              <button
                type="button"
                id="waybill-add-item"
                className="button button-secondary"
                onClick={addItem}
              >
                Add Item
              </button>

              <div className="waybill-signature-grid">
                <div className="signature-card">
                  <span className="signature-title">Delivered By</span>
                  <label className="field-block">
                    <input
                      type="text"
                      id="waybill-driver"
                      name="driver_name"
                      placeholder="Dispatch officer"
                      value={driver}
                      onChange={(e) => setDriver(e.target.value)}
                      required
                    />
                  </label>
                  <div className="signature-line">Signature</div>
                </div>
                <div className="signature-card">
                  <span className="signature-title">Received By</span>
                  <label className="field-block">
                    <input
                      type="text"
                      id="waybill-receiver"
                      name="receiver_name"
                      placeholder="Receiving officer"
                      value={receiver}
                      onChange={(e) => setReceiver(e.target.value)}
                      required
                    />
                  </label>
                  <div className="signature-line">Signature</div>
                </div>
              </div>

              <section className="waybill-contact-bar">
                <input
                  type="text"
                  id="waybill-contact"
                  placeholder="DELIVERED BY SPAQUELS • CONTACT: 0540 673202 | 050 532 1475 | 030 273 8719"
                  aria-label="Waybill contact information"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </section>
            </form>

            {/* Preview */}
            <article
              id="waybill-preview"
              className={`document waybill-document ${!isPreview ? 'is-hidden' : ''}`}
              style={{ display: !isPreview ? 'none' : 'block' }}
            >
              <div className="waybill-letterhead">
                <div className="letterhead-left">
                  <h3>WAYBILL</h3>
                  <p>No.: <span className="js-waybill-preview-number">{waybillNumber}</span></p>
                  <p className="waybill-date">Date: <span className="js-waybill-preview-date">{formatDisplayDate(issueDate)}</span></p>
                </div>
                <div className="letterhead-right">
                  <img src="/assets/logo.png" alt="logo-placeholder" className="logo-placeholder" />
                </div>
              </div>

              <table className="document-items">
                <thead>
                  <tr>
                    <th className="description">Description</th>
                    <th>Qty</th>
                    <th>Unit Price (GHC)</th>
                    <th>Amount (GHC)</th>
                  </tr>
                </thead>
                <tbody className="js-waybill-preview-rows">{renderPreviewRows()}</tbody>
              </table>

              <div className="waybill-signature-grid">
                <div className="signature-card">
                  <span className="signature-title">Delivered By</span>
                  <div className="field-block">
                    <p className="js-waybill-preview-driver" style={{ margin: 0, padding: '0.1rem 0.25rem' }}>
                      {driver || '—'}
                    </p>
                  </div>
                  <div className="signature-line">Signature</div>
                </div>
                <div className="signature-card">
                  <span className="signature-title">Received By</span>
                  <div className="field-block">
                    <p className="js-waybill-preview-receiver" style={{ margin: 0, padding: '0.1rem 0.25rem' }}>
                      {receiver || '—'}
                    </p>
                  </div>
                  <div className="signature-line">Signature</div>
                </div>
              </div>

              <section id="waybill-preview-contact">
                <div className="contact-wrapper">
                  <p className="account">
                    <span>0543127562 <span className="icon-placeholder">[MM]</span></span>
                    <span>0505321475 <span className="icon-placeholder">[WA]</span></span>
                    <span>0540673202</span>
                    <span><strong>BANKERS:</strong> FIDELITY BANK (2400070371317)</span>
                  </p>
                  <p className="email">
                    <span>Email: spaquelsmultimedia@gmail.com</span>
                    <span>Website: www.spaquelsmultimedia.org</span>
                  </p>
                </div>
              </section>
            </article>
          </div>

          {/* Toast */}
          {toast.visible && (
            <div className={`module-toast is-${toast.type}`} id="waybill-toast" role="status" aria-live="polite">
              {toast.message}
            </div>
          )}
        </section>
      </main>
    </Layout>
  );
};

export default Waybill;
