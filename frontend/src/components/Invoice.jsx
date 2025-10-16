import React, { useState, useEffect, useCallback } from 'react';
import Layout from './Layout';
import '../styles/invoice.css';
import { chooseDownloadFormat } from '../utils/formatChooser';

const DEFAULT_TAX_SETTINGS = {
  NHIL: 0.025,
  GETFUND: 0.025,
  COVID: 0.01,
  VAT: 0.15,
};

const Invoice = () => {
  const API_BASE = "http://127.0.0.1:8765";
  
  // State management
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('INV000');
  const [invoiceNumberReserved, setInvoiceNumberReserved] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    issue_date: new Date().toISOString().split('T')[0],
    notes: `• Invoices we submit in respect of our services (any other payable charges) will be paid in full or a deposit of 70% made either by cash, bank or mobile money.
• Work is guaranteed once a deposit or a full payment is paid. NOTE!!: full payment should be made 3 days after delivery or on delivery.
• Job completion date is communicated once payment is received.
• Money paid is not refundable.
• All items brought for service must be checked well before leaving the premises, we will not be held liable in the event that a mistake occurred.
• Delivery options available at a fee.`
  });
  
  const [items, setItems] = useState([
    { description: '', quantity: 0, unit_price: 0, total: 0 }
  ]);

  const [taxSettings, setTaxSettings] = useState(() => ({ ...DEFAULT_TAX_SETTINGS }));
  const [calculations, setCalculations] = useState(() => ({
    subtotal: 0,
    levies: {},
    grandTotal: 0,
  }));

  const [toast, setToast] = useState({ message: '', visible: false, type: 'info' });
  const [isDownloading, setIsDownloading] = useState(false);

  const showToast = (message, type = 'info') => {
    setToast({ message, visible: true, type });
    setTimeout(() => setToast({ message: '', visible: false, type: 'info' }), 3000);
  };

  const formatPercentage = (rate) => {
    if (typeof rate !== 'number' || Number.isNaN(rate)) {
      return null;
    }
    const percent = (rate * 100).toFixed(2);
    return percent.endsWith('.00') ? percent.slice(0, -3) : percent;
  };

  const formatLevyLabel = useCallback((name) => {
    const cleanedName = (name || '').trim();
    const rateSource = taxSettings?.[cleanedName] ?? DEFAULT_TAX_SETTINGS[cleanedName];
    const numericRate = typeof rateSource === 'number' ? rateSource : Number(rateSource) || 0;
    const percentLabel = formatPercentage(numericRate);
    return percentLabel ? `${cleanedName || 'Levy'} (${percentLabel}%)` : cleanedName || 'Levy';
  }, [taxSettings]);

  const formatQuantity = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return '0';
    }
    return Number.isInteger(numeric) ? numeric.toString() : numeric.toFixed(2);
  };

  const formatCurrency = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return '0.00';
    }
    return numeric.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const buildItemsPayload = useCallback(() => {
    return items.map((item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      const totalRaw = quantity * unitPrice;
      const total = Number.isFinite(totalRaw) ? Math.round(totalRaw * 100) / 100 : 0;

      return {
        description: item.description || '',
        quantity,
        unit_price: unitPrice,
        total,
      };
    });
  }, [items]);

  const computeLocalTotals = useCallback((payloadItems) => {
    const effectiveSettings = taxSettings && Object.keys(taxSettings).length ? taxSettings : DEFAULT_TAX_SETTINGS;
    const subtotalValue = payloadItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

    const leviesMap = {};
    let levyValueTotal = 0;
    let vatAmount = 0;

    Object.entries(effectiveSettings).forEach(([name, rate]) => {
      const numericRate = Number(rate) || 0;
      const amount = subtotalValue * numericRate;
      const roundedAmount = Math.round(amount * 100) / 100;
      leviesMap[name] = roundedAmount;
      if (name.trim().toUpperCase() === 'VAT') {
        vatAmount += roundedAmount;
      } else {
        levyValueTotal += roundedAmount;
      }
    });

    const grandTotalValue = subtotalValue + levyValueTotal + vatAmount;

    return {
      subtotal: Math.round(subtotalValue * 100) / 100,
      levies: leviesMap,
      grandTotal: Math.round(grandTotalValue * 100) / 100,
    };
  }, [taxSettings]);

  const loadNextInvoiceNumber = useCallback(async () => {
    if (invoiceNumberReserved) {
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/counter/invoice/next/`);
      if (!response.ok) {
        return;
      }
      const data = await response.json().catch(() => ({}));
      if (data?.next_number) {
        setInvoiceNumber(data.next_number);
      }
    } catch (error) {
      console.warn('Failed to load next invoice number', error);
    }
  }, [API_BASE, invoiceNumberReserved]);

  const ensureInvoiceNumberReserved = useCallback(async () => {
    if (invoiceNumberReserved && invoiceNumber) {
      return { number: invoiceNumber, reserved: true };
    }

    try {
      const response = await fetch(`${API_BASE}/api/counter/invoice/next/`, { method: 'POST' });
      if (!response.ok) {
        throw new Error(`Failed to reserve invoice number (${response.status})`);
      }
      const data = await response.json().catch(() => ({}));
      const nextNumber = data?.next_number || invoiceNumber || 'INV000';
      setInvoiceNumber(nextNumber);
      setInvoiceNumberReserved(true);
      return { number: nextNumber, reserved: true };
    } catch (error) {
      console.warn('Could not reserve invoice number', error);
      setInvoiceNumberReserved(false);
      await loadNextInvoiceNumber();
      return { number: invoiceNumber, reserved: false, error };
    }
  }, [API_BASE, invoiceNumber, invoiceNumberReserved, loadNextInvoiceNumber]);

  useEffect(() => {
    const loadTaxConfig = async () => {
      try {
        const response = await fetch(`${API_BASE}/invoices/api/config/`);
        if (!response.ok) {
          throw new Error(`Failed to load tax config (${response.status})`);
        }
        const data = await response.json().catch(() => ({}));
        const settings = data?.tax_settings;
        if (settings && typeof settings === 'object') {
          const normalized = {};
          Object.entries(settings).forEach(([key, rate]) => {
            const cleanedKey = String(key).trim() || key;
            normalized[cleanedKey] = Number(rate) || 0;
          });
          if (Object.keys(normalized).length) {
            setTaxSettings(normalized);
            return;
          }
        }
      } catch (error) {
        console.warn('Failed to load tax settings', error);
      }
      setTaxSettings({ ...DEFAULT_TAX_SETTINGS });
    };

    loadTaxConfig();
  }, [API_BASE]);

  useEffect(() => {
    loadNextInvoiceNumber();
  }, [loadNextInvoiceNumber]);

  useEffect(() => {
    const calculateTotals = async () => {
      const payloadItems = buildItemsPayload();
      const localTotals = computeLocalTotals(payloadItems);
      const issueDate = formData.issue_date || new Date().toISOString().split('T')[0];

      try {
        const response = await fetch(`${API_BASE}/invoices/api/calculate-preview/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_name: 'Preview Customer',
            issue_date: issueDate,
            items_payload: JSON.stringify(payloadItems),
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to calculate totals (${response.status})`);
        }

        const data = await response.json().catch(() => ({}));
        const leviesData = data?.levies || {};
        const normalizedLevies = { ...localTotals.levies };
        Object.entries(leviesData).forEach(([name, amount]) => {
          normalizedLevies[name] = Number(amount) || 0;
        });

        const subtotalValue = Number(data?.subtotal);
        const grandTotalValue = Number(data?.grand_total);

        setCalculations({
          subtotal: Number.isFinite(subtotalValue) ? subtotalValue : localTotals.subtotal,
          levies: normalizedLevies,
          grandTotal: Number.isFinite(grandTotalValue) ? grandTotalValue : localTotals.grandTotal,
        });
      } catch (error) {
        console.warn('Failed to calculate totals', error);
        setCalculations(localTotals);
      }
    };

    calculateTotals();
  }, [API_BASE, buildItemsPayload, computeLocalTotals, formData.issue_date]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prevItems) => {
      if (!prevItems[index]) {
        return prevItems;
      }

      const updated = [...prevItems];
      const current = { ...updated[index], [field]: value };

      if (field === 'quantity' || field === 'unit_price') {
        const qty = parseFloat(field === 'quantity' ? value : current.quantity) || 0;
        const price = parseFloat(field === 'unit_price' ? value : current.unit_price) || 0;
        current.total = Math.round(qty * price * 100) / 100;
      }

      updated[index] = current;
      return updated;
    });
  };

  const addItem = () => {
    if (items.length >= 10) {
      showToast('Maximum 10 items allowed', 'error');
      return;
    }
    setItems(prev => [...prev, { description: '', quantity: 0, unit_price: 0, total: 0 }]);
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const togglePreview = () => {
    setIsPreviewMode((prev) => !prev);
  };

  const buildPdfPayload = (format, documentNumber) => {
    const previewElement = document.getElementById('invoice-preview');
    if (!previewElement) {
      throw new Error('Preview element not found');
    }

    const clone = previewElement.cloneNode(true);
    clone.removeAttribute('hidden');
    clone.removeAttribute('style');
    clone.setAttribute('data-pdf-clone', 'true');
    clone.classList.add('pdf-export');

    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-export-wrapper';
    wrapper.appendChild(clone);

    const normalizedFormat = format === 'jpeg' ? 'jpeg' : 'pdf';
    const safeBase = String(documentNumber || invoiceNumber || 'invoice').trim().replace(/\s+/g, '_');
    const extension = normalizedFormat === 'jpeg' ? 'jpg' : 'pdf';

    return {
      document_type: 'invoice',
      html: wrapper.outerHTML,
      filename: `${safeBase}.${extension}`,
      format: normalizedFormat,
    };
  };

  const downloadInvoice = async (format = 'pdf', documentNumber = invoiceNumber) => {
    const payload = buildPdfPayload(format, documentNumber);
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
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    document.body.appendChild(link);
    try {
      link.href = url;
      link.download = payload.filename;
      link.click();
    } finally {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  };

  const handleDownload = async () => {
    if (isDownloading) {
      return;
    }

    const chosenFormat = await chooseDownloadFormat();
    if (!chosenFormat) {
      return;
    }

    const normalizedFormat = chosenFormat === 'jpeg' ? 'jpeg' : 'pdf';
    const wasInPreview = isPreviewMode;
    setIsDownloading(true);

    try {
      const reservation = await ensureInvoiceNumberReserved();
      const activeNumber = reservation?.number || invoiceNumber;

      if (!wasInPreview) {
        setIsPreviewMode(true);
        await new Promise((resolve) => setTimeout(resolve, 120));
      } else {
        await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      }

      if (reservation?.number && reservation.number !== invoiceNumber) {
        setInvoiceNumber(reservation.number);
        await new Promise((resolve) => setTimeout(resolve, 60));
      }

      await downloadInvoice(normalizedFormat, activeNumber);

      const label = normalizedFormat === 'jpeg' ? 'JPEG' : 'PDF';
      if (reservation?.reserved) {
        showToast(`Invoice downloaded as ${label}!`, 'success');
      } else {
        showToast(`Invoice downloaded as ${label}! However, a new number could not be reserved.`, 'warning');
      }
      setInvoiceNumberReserved(false);
      await loadNextInvoiceNumber();
    } catch (error) {
      console.error('Download error:', error);
      showToast(error.message || 'Failed to download invoice', 'error');
    } finally {
      if (!wasInPreview) {
        setIsPreviewMode(false);
      }
      setIsDownloading(false);
    }
  };

  const vatKeyCandidates = Object.keys(taxSettings || {});
  const vatKey = vatKeyCandidates.find((key) => key.trim().toUpperCase() === 'VAT')
    || Object.keys(calculations.levies || {}).find((key) => key.trim().toUpperCase() === 'VAT')
    || 'VAT';
  const vatKeyUpper = vatKey.trim().toUpperCase();

  const orderedLevyNames = vatKeyCandidates.filter((name) => name.trim().toUpperCase() !== vatKeyUpper);
  const seenLevyNames = new Set(orderedLevyNames);
  Object.keys(calculations.levies || {}).forEach((name) => {
    const trimmed = (name || '').trim();
    if (!trimmed || trimmed.toUpperCase() === vatKeyUpper) {
      return;
    }
    if (!seenLevyNames.has(name)) {
      orderedLevyNames.push(name);
      seenLevyNames.add(name);
    }
  });

  const levyRows = orderedLevyNames.map((name) => {
    const amount = Number(calculations.levies?.[name] ?? 0);
    return {
      name,
      label: formatLevyLabel(name),
      amount: Number.isFinite(amount) ? amount : 0,
    };
  });

  const vatAmount = Number(calculations.levies?.[vatKey] ?? 0);
  const levyValueTotal = levyRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const levyAndValueTotal = (Number(calculations.subtotal) || 0) + levyValueTotal;
  const vatLabel = formatLevyLabel(vatKey);
  const noteLines = (formData.notes || '')
    .split('\n')
    .map((line) => line.replace(/^[•-]\s*/, '').trim())
    .filter(Boolean);

  return (
    <Layout title="Invoice | Billing App">
      <section id="invoice-module" className={`module${isPreviewMode ? ' is-preview' : ''}`}>
        {/* Module Header */}
        <div className="module-header">
          <h2>Invoice</h2>
          <div className="module-actions">
            <button 
              className="button button-secondary" 
              type="button"
              onClick={togglePreview}
            >
              {isPreviewMode ? 'Back to Edit' : 'Preview'}
            </button>
            <button 
              className="button" 
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              aria-busy={isDownloading}
            >
              {isDownloading ? 'Downloading...' : 'Download'}
            </button>
          </div>
        </div>

        {/* Module Body */}
        <div className="module-body">
          <div className="a4-workspace">
            
            {/* EDIT MODE */}
            {!isPreviewMode && (
              <form id="invoice-form" className="document document-editable">
                {/* Letterhead */}
                <div className="invoice-letterhead">
                  <div className="letterhead-brand">
                    <img src="/assets/logo.png" alt="Logo placeholder" className="logo-placeholder" />
                  </div>
                  <div className="letterhead-meta">
                    <div className="letterhead-meta-left">
                      <label className="field-block">
                        <input 
                          type="text" 
                          name="customer_name"
                          value={formData.customer_name}
                          onChange={handleFormChange}
                          placeholder="Client name" 
                          required 
                        />
                      </label>
                    </div>
                    <div className="letterhead-meta-right">
                      <p className="document-number">Invoice No.: <span>{invoiceNumber}</span></p>
                      <label className="field-block">
                        <span>Date: <input 
                          type="date" 
                          name="issue_date"
                          value={formData.issue_date}
                          onChange={handleFormChange}
                          required 
                        /></span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div className="invoice-title">
                  <h3>PRO-FORMA INVOICE</h3>
                </div>

                {/* Items Table */}
                <table className="document-items">
                  <thead>
                    <tr>
                      <th className="description">Description / Classification</th>
                      <th>Qty</th>
                      <th>Cost per Unit (GHC)</th>
                      <th>Total Cost (GHC)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(10)].map((_, index) => {
                      const item = items[index];
                      if (item) {
                        return (
                          <tr key={index}>
                            <td>
                              <input 
                                type="text" 
                                value={item.description}
                                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                placeholder="Item description"
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                min="0"
                                step="0.01"
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                value={item.unit_price}
                                onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                min="0"
                                step="0.01"
                              />
                            </td>
                            <td>{formatCurrency(item.total)}</td>
                            <td>
                              <button 
                                type="button" 
                                onClick={() => removeItem(index)}
                                className="button-remove"
                                title="Remove item"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        );
                      } else {
                        return (
                          <tr key={index} className="empty-row">
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                          </tr>
                        );
                      }
                    })}
                  </tbody>
                </table>
                <button type="button" onClick={addItem} className="button button-secondary">
                  Add Item
                </button>

                {/* Summary */}
                <div className="invoice-summary">
                  <table className="summary-table">
                    <tbody>
                      <tr>
                        <th>Sub Total (Without VAT)</th>
                        <td>{formatCurrency(calculations.subtotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="levies-table">
                    {levyRows.length ? (
                      levyRows.map(({ name, label, amount }) => (
                        <div className="levy-row" key={name}>
                          <span>{label}</span>
                          <span>{formatCurrency(amount)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="levy-row">
                        <span>Levies</span>
                        <span>{formatCurrency(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="levy-total-row">
                    <span>Total Levies + Value</span>
                    <span>{formatCurrency(levyAndValueTotal)}</span>
                  </div>
                  <div className="vat-row">
                    <span>{vatLabel}</span>
                    <span>{formatCurrency(vatAmount)}</span>
                  </div>
                  <div className="grand-total">
                    <span>Grand Total</span>
                    <span>{formatCurrency(calculations.grandTotal)}</span>
                  </div>
                </div>

                {/* Notes */}
                <section className="invoice-notes">
                  <h4>Notes</h4>
                  <textarea 
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                    rows="6" 
                    aria-label="Invoice notes list"
                  />
                </section>

                <section className="invoice-footer-details"></section>
                <section className="invoice-contact-bar"></section>
              </form>
            )}

            {/* PREVIEW MODE */}
            {isPreviewMode && (
              <div id="invoice-preview" className="document">
                <div className="invoice-letterhead">
                  <div className="letterhead-brand">
                    <img src="/assets/logo.png" alt="Company Logo Placeholder" className="logo-placeholder" />
                  </div>
                  <div className="letterhead-meta">
                    <div className="letterhead-meta-left">
                      <p><strong>Customer Name:</strong></p>
                      <p><strong>{formData.customer_name || '—'}</strong></p>
                    </div>
                    <div className="letterhead-meta-right">
                      <p className="document-number">Invoice No.: <span>{invoiceNumber}</span></p>
                      <p>Date:&nbsp;&nbsp;<span>{formData.issue_date || '—'}</span></p>
                    </div>
                  </div>
                </div>

                <div className="invoice-title">
                  <h3>PRO-FORMA INVOICE</h3>
                </div>

                <table className="document-items">
                  <thead>
                    <tr>
                      <th className="description">Description / Classification</th>
                      <th>Qty</th>
                      <th>Cost per Unit (GHC)</th>
                      <th>Total Cost (GHC)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(10)].map((_, index) => {
                      const item = items[index];
                      if (item) {
                        return (
                          <tr key={index}>
                            <td>{item.description || '—'}</td>
                            <td>{formatQuantity(item.quantity)}</td>
                            <td>{formatCurrency(item.unit_price)}</td>
                            <td>{formatCurrency(item.total)}</td>
                          </tr>
                        );
                      } else {
                        return (
                          <tr key={index} className="empty-row">
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                          </tr>
                        );
                      }
                    })}
                  </tbody>
                </table>

                <section className="invoice-signature">
                  <div className="signature-block">
                    <img src="/assets/sign.png" alt="Signature" className="signature-image" />
                    <div className="signature-line">Signature</div>
                    <div className="signature-meta">
                      <p>Raphael Quame Agbeshie</p>
                      <p>(Creative Director)</p>
                    </div>
                  </div>
                </section>

                <div className="invoice-summary">
                  <table className="summary-table">
                    <tbody>
                      <tr>
                        <th>Sub Total (Without VAT)</th>
                        <td>{formatCurrency(calculations.subtotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="levies-table">
                    {levyRows.length ? (
                      levyRows.map(({ name, label, amount }) => (
                        <div className="levy-row" key={`${name}-preview`}>
                          <span>{label}</span>
                          <span>{formatCurrency(amount)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="levy-row">
                        <span>Levies</span>
                        <span>{formatCurrency(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="levy-total-row">
                    <span>Total Levies + Value</span>
                    <span>{formatCurrency(levyAndValueTotal)}</span>
                  </div>
                  <div className="vat-row">
                    <span>{vatLabel}</span>
                    <span>{formatCurrency(vatAmount)}</span>
                  </div>
                  <div className="grand-total">
                    <span>Grand Total</span>
                    <span>{formatCurrency(calculations.grandTotal)}</span>
                  </div>
                </div>

                <section className="invoice-notes">
                  <ul>
                    {noteLines.length ? (
                      noteLines.map((note, index) => (
                        <li key={index}>{note}</li>
                      ))
                    ) : (
                      <li className="empty-state">Add notes to display terms.</li>
                    )}
                  </ul>
                </section>

                <section id="invoice-preview-contact">
                  <div className="contact-wrapper">
                    <p className="email">
                      <span>Email: spaquelsmultimedia@gmail.com</span>
                      <span>Website: www.spaquelsmultimedia.org</span>
                    </p>
                    <p className="account">
                      <span>0543127562 <span className="icon-placeholder">[MM]</span></span>
                      <span>0505321475 <span className="icon-placeholder">[WA]</span></span>
                      <span>0540673202</span>
                      <span><strong>BANKERS:</strong> FIDELITY BANK (2400070371317)</span>
                    </p>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>

        {/* Toast Notification */}
        {toast.visible && (
          <div className={`module-toast is-${toast.type}`} role="status" aria-live="polite">
            {toast.message}
          </div>
        )}
      </section>

      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Billing App. All rights reserved.</p>
      </footer>
    </Layout>
  );
};

export default Invoice;