import { useState, useEffect, useCallback } from 'react';
import Layout from './Layout';
import '../styles/general.css';
import '../styles/receipt.css';

const API_BASE = 'http://127.0.0.1:8765';

const Receipt = () => {
  const [isPreview, setIsPreview] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('REC-NEW');
  const [receiptNumberReserved, setReceiptNumberReserved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form data
  const [issueDate, setIssueDate] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [customerName, setCustomerName] = useState('');
  
  // Items state
  const [items, setItems] = useState([
    { description: '', quantity: 0, unit_price: 0, total: 0 }
  ]);
  
  // Calculations
  const [totalAmount, setTotalAmount] = useState(0);
  const [balance, setBalance] = useState(0);
  
  // Toast state
  const [toast, setToast] = useState({ message: '', type: '', visible: false });

  const calculateTotals = useCallback(() => {
    const total = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const paid = Number(amountPaid) || 0;
    const bal = total - paid;
    
    setTotalAmount(total);
    setBalance(bal);
  }, [items, amountPaid]);

  const loadNextReceiptNumber = useCallback(async () => {
    if (receiptNumberReserved) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/counter/receipt/next/`);
      if (response.ok) {
        const data = await response.json();
        setReceiptNumber(data.next_number || 'REC-NEW');
      }
    } catch (error) {
      console.warn('Failed to load next receipt number', error);
    }
  }, [receiptNumberReserved]);

  // Load next receipt number on mount
  useEffect(() => {
    loadNextReceiptNumber();
  }, [loadNextReceiptNumber]);

  // Calculate totals whenever items or amountPaid changes
  useEffect(() => {
    calculateTotals();
  }, [calculateTotals]);

  const ensureReceiptNumberReserved = async () => {
    if (receiptNumberReserved && receiptNumber) {
      return { number: receiptNumber, reserved: true };
    }
    
    try {
      const response = await fetch(`${API_BASE}/api/counter/receipt/next/`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to reserve receipt number (${response.status})`);
      }
      
      const data = await response.json();
      if (data?.next_number) {
        setReceiptNumber(data.next_number);
        setReceiptNumberReserved(true);
      }
      
      return { number: receiptNumber, reserved: true };
    } catch (error) {
      console.warn('Could not reserve receipt number', error);
      setReceiptNumberReserved(false);
      await loadNextReceiptNumber();
      return { number: receiptNumber, reserved: false, error };
    }
  };

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
    const previewEl = document.getElementById('receipt-preview');
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
    const safeBase = String(receiptNumber || 'receipt').trim().replace(/\s+/g, '_');
    const extension = normalizedFormat === 'jpeg' ? 'jpg' : 'pdf';

    return {
      document_type: 'receipt',
      html: wrapper.outerHTML,
      filename: `${safeBase}.${extension}`,
      format: normalizedFormat,
    };
  };

  const downloadReceipt = async (format = 'pdf') => {
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

  const handleDownload = async () => {
    if (isSaving) return;

    setIsSaving(true);

    try {
      const reservation = await ensureReceiptNumberReserved();
      await downloadReceipt('pdf');
      
      const successMessage = 'Receipt downloaded as PDF!';
      if (reservation?.reserved) {
        showToast(successMessage);
        setReceiptNumberReserved(false);
        await loadNextReceiptNumber();
      } else {
        showToast(`${successMessage} However, a new number could not be reserved.`, 'warning');
        setReceiptNumberReserved(false);
        await loadNextReceiptNumber();
      }
    } catch (error) {
      console.error('Failed to download receipt', error);
      showToast(error.message || 'Failed to download receipt', 'error');
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
                step="1"
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
            <td className="total-cell">{formatCurrency(item.total)}</td>
            <td>
              <button
                type="button"
                className="button-icon"
                onClick={() => removeItem(i)}
                title="Remove item"
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
            <td>{item.description || '—'}</td>
            <td>{item.quantity || 0}</td>
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
        <section id="receipt-module" className="module" data-document-type="receipt">
          <div className="module-header">
            <h2>Receipt</h2>
            <div className="module-actions">
              <button
                id="receipt-preview-toggle"
                className="button button-secondary"
                type="button"
                onClick={togglePreview}
              >
                {isPreview ? 'Back to Edit' : 'Preview'}
              </button>
              <button
                id="receipt-submit"
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
            <div className="a4-workspace">
              {/* Edit Form */}
              <form
                id="receipt-form"
                className={`document receipt-document document-editable ${isPreview ? 'is-hidden' : ''}`}
                style={{ display: isPreview ? 'none' : 'block' }}
              >
                <div className="receipt-letterhead">
                  <div className="letterhead-left">
                    <h3>RECEIPT</h3>
                    <p>No.: <span id="receipt-number">{receiptNumber}</span></p>
                    <label className="field-block">
                      <span>Date</span>
                      <input
                        type="date"
                        id="receipt-issue-date"
                        name="issue_date"
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        required
                      />
                    </label>
                  </div>
                  <div className="letterhead-right">
                    <img src="/assets/logo.png" alt="logo-placeholder" className="logo-placeholder" />
                  </div>
                </div>

                <section className="receipt-body">
                  <table className="document-items" id="receipt-items-table">
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
                    id="receipt-add-item"
                    className="button button-secondary"
                    onClick={addItem}
                  >
                    Add Item
                  </button>

                  <div className="receipt-payment-section">
                    <label className="field-block">
                      <span>Amount Paid (GHC)</span>
                      <input
                        type="number"
                        step="0.01"
                        id="receipt-amount-paid"
                        name="amount_paid"
                        placeholder="0.00"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        required
                      />
                    </label>
                    <label className="field-block">
                      <span>Payment Method</span>
                      <select
                        id="receipt-payment-method"
                        name="payment_method"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        required
                      >
                        <option value="">Select method</option>
                        <option value="Cash">Cash</option>
                        <option value="Mobile Money">Mobile Money</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </label>
                  </div>

                  <div className="receipt-totals">
                    <div className="total-row">
                      <span>Total Amount:</span>
                      <span id="receipt-total-display">GH₵ {formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="total-row balance-row">
                      <span>Balance:</span>
                      <span id="receipt-balance-display">GH₵ {formatCurrency(balance)}</span>
                    </div>
                  </div>
                </section>

                <section className="receipt-signature">
                  <div className="signature-left">
                    <label className="field-block">
                      <span>Issued By: </span>
                      <input
                        type="text"
                        id="receipt-issued-by"
                        name="issued_by"
                        placeholder="Issued by"
                        value={issuedBy}
                        onChange={(e) => setIssuedBy(e.target.value)}
                        required
                      />
                    </label>
                  </div>
                  <div className="signature-right">
                    <label className="field-block">
                      <span>Customer Name</span>
                      <input
                        type="text"
                        id="receipt-customer-name"
                        name="customer_name"
                        placeholder="Client name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                      />
                    </label>
                  </div>
                </section>
              </form>

              {/* Preview */}
              <div
                id="receipt-preview"
                className={`document receipt-document receipt-preview-landscape ${!isPreview ? 'is-hidden' : ''}`}
                style={{ display: !isPreview ? 'none' : 'block' }}
              >
                <div className="receipt-letterhead">
                  <div className="letterhead-left">
                    <h3>RECEIPT</h3>
                    <p>No.: <span className="js-receipt-preview-number">{receiptNumber}</span></p>
                    <p className="receipt-date">Date: <span className="js-receipt-preview-date">{formatDisplayDate(issueDate)}</span></p>
                  </div>
                  <div className="letterhead-right">
                    <img src="/assets/logo.png" alt="logo-placeholder" className="logo-placeholder" />
                  </div>
                </div>

                <section className="receipt-body">
                  <table className="document-items">
                    <thead>
                      <tr>
                        <th className="description">Description</th>
                        <th>Qty</th>
                        <th>Unit Price (GHC)</th>
                        <th>Amount (GHC)</th>
                      </tr>
                    </thead>
                    <tbody id="receipt-preview-rows">{renderPreviewRows()}</tbody>
                  </table>

                  <div className="receipt-summary-section">
                    <div className="receipt-payment-info">
                      <p><strong>Payment Method:</strong> <span className="js-receipt-preview-payment-method">{paymentMethod || '—'}</span></p>
                      <p><strong>Amount Paid:</strong> <span className="js-receipt-preview-amount-paid">GH₵ {formatCurrency(amountPaid)}</span></p>
                    </div>

                    <div className="receipt-totals">
                      <div className="total-row">
                        <span>Total Amount:</span>
                        <span className="js-receipt-preview-total-amount">GH₵ {formatCurrency(totalAmount)}</span>
                      </div>
                      <div className="total-row balance-row">
                        <span>Balance:</span>
                        <span className="js-receipt-preview-balance">GH₵ {formatCurrency(balance)}</span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="receipt-signature">
                  <div className="signature-left">
                    <p><strong>Creative Director</strong></p>
                    <div className="signature-block">
                      <img src="/assets/sign.png" alt="Creative Director Signature" className="signature-image" />
                    </div>
                  </div>
                  <div className="signature-right">
                    <p><strong>Customer Name:</strong> <span className="js-receipt-preview-customer-name">{customerName || '—'}</span></p>
                    <p style={{ marginTop: '1rem' }}><strong>Issued By:</strong> <span className="js-receipt-preview-issued-by">{issuedBy || '—'}</span></p>
                  </div>
                </section>

                <section id="receipt-preview-contact">
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
              </div>
            </div>
          </div>

          {/* Toast */}
          {toast.visible && (
            <div className={`module-toast is-${toast.type}`} id="receipt-toast" role="status" aria-live="polite">
              {toast.message}
            </div>
          )}
        </section>
      </main>
    </Layout>
  );
};

export default Receipt;
