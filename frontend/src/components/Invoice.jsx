import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import '../styles/invoice.css';

const Invoice = () => {
  const API_BASE = "http://127.0.0.1:8765";
  
  // State management
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('INV000');
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
    { description: '', quantity: 1, unit_cost: 0, total: 0 }
  ]);
  
  const [calculations, setCalculations] = useState({
    subtotal: 0,
    nhil: 0,
    getfund: 0,
    covid: 0,
    levy_total: 0,
    vat: 0,
    grand_total: 0
  });

  const [toast, setToast] = useState({ message: '', visible: false, type: 'info' });

  // Reserve invoice number on mount
  useEffect(() => {
    async function reserveInvoiceNumber() {
      try {
        const response = await fetch(`${API_BASE}/api/counter/invoice/next/`, { method: 'POST' });
        if (response.ok) {
          const data = await response.json();
          setInvoiceNumber(data.next_number || 'INV000');
        }
      } catch (error) {
        console.error('Failed to reserve invoice number:', error);
        showToast('Failed to reserve invoice number', 'error');
      }
    }
    reserveInvoiceNumber();
  }, []);

  // Calculate totals whenever items change
  useEffect(() => {
    const calc = async () => {
      try {
        const itemsPayload = items.map(item => ({
          description: item.description,
          quantity: parseFloat(item.quantity) || 0,
          unit_cost: parseFloat(item.unit_cost) || 0
        }));

        const response = await fetch(`${API_BASE}/invoices/api/calculate-preview/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: itemsPayload })
        });

        if (response.ok) {
          const data = await response.json();
          setCalculations({
            subtotal: data.subtotal || 0,
            nhil: data.nhil || 0,
            getfund: data.getfund || 0,
            covid: data.covid || 0,
            levy_total: data.levy_total || 0,
            vat: data.vat || 0,
            grand_total: data.grand_total || 0
          });
        }
      } catch (error) {
        console.error('Failed to calculate totals:', error);
      }
    };
    calc();
  }, [items]);

  const showToast = (message, type = 'info') => {
    setToast({ message, visible: true, type });
    setTimeout(() => setToast({ message: '', visible: false, type: 'info' }), 3000);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Recalculate total for this item
    if (field === 'quantity' || field === 'unit_cost') {
      const qty = parseFloat(newItems[index].quantity) || 0;
      const cost = parseFloat(newItems[index].unit_cost) || 0;
      newItems[index].total = qty * cost;
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_cost: 0, total: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    } else {
      showToast('At least one item is required', 'warning');
    }
  };



  const togglePreview = () => {
    if (!formData.customer_name) {
      showToast('Please enter customer name', 'warning');
      return;
    }
    if (items.some(item => !item.description)) {
      showToast('Please fill in all item descriptions', 'warning');
      return;
    }
    setIsPreviewMode(!isPreviewMode);
  };

  const handleDownload = async () => {
    // Auto-switch to preview mode if not already in preview
    if (!isPreviewMode) {
      setIsPreviewMode(true);
      // Give a moment for the preview to render
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      const previewElement = document.getElementById('invoice-preview');
      if (!previewElement) return;

      const pdfPayload = {
        html: previewElement.outerHTML,
        document_type: 'invoice'
      };

      const response = await fetch(`${API_BASE}/api/pdf/render/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pdfPayload)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice_${invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast('PDF downloaded successfully', 'success');
      } else {
        showToast('Failed to generate PDF', 'error');
      }
    } catch (error) {
      console.error('Download error:', error);
      showToast('Failed to download PDF', 'error');
    }
  };

  const formatCurrency = (value) => {
    return parseFloat(value || 0).toFixed(2);
  };

  return (
    <Layout title="Invoice | Billing App">
      <section id="invoice-module" className="module">
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
            >
              Download
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
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <input 
                            type="text" 
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder="Item description"
                            required
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
                            value={item.unit_cost}
                            onChange={(e) => handleItemChange(index, 'unit_cost', e.target.value)}
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
                            disabled={items.length === 1}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
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
                    <div className="levy-row">
                      <span>NHIL (2.5%)</span>
                      <span>{formatCurrency(calculations.nhil)}</span>
                    </div>
                    <div className="levy-row">
                      <span>GETFUND (2.5%)</span>
                      <span>{formatCurrency(calculations.getfund)}</span>
                    </div>
                    <div className="levy-row">
                      <span>COVID (1%)</span>
                      <span>{formatCurrency(calculations.covid)}</span>
                    </div>
                  </div>
                  <div className="levy-total-row">
                    <span>Total Levies + Value</span>
                    <span>{formatCurrency(calculations.levy_total)}</span>
                  </div>
                  <div className="vat-row">
                    <span>VAT (15%)</span>
                    <span>{formatCurrency(calculations.vat)}</span>
                  </div>
                  <div className="grand-total">
                    <span>Grand Total</span>
                    <span>{formatCurrency(calculations.grand_total)}</span>
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
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.description}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.unit_cost)}</td>
                        <td>{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
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
                    <div className="levy-row">
                      <span>NHIL (2.5%)</span>
                      <span>{formatCurrency(calculations.nhil)}</span>
                    </div>
                    <div className="levy-row">
                      <span>GETFUND (2.5%)</span>
                      <span>{formatCurrency(calculations.getfund)}</span>
                    </div>
                    <div className="levy-row">
                      <span>COVID (1%)</span>
                      <span>{formatCurrency(calculations.covid)}</span>
                    </div>
                  </div>
                  <div className="levy-total-row">
                    <span>Total Levies + Value</span>
                    <span>{formatCurrency(calculations.levy_total)}</span>
                  </div>
                  <div className="vat-row">
                    <span>VAT (15%)</span>
                    <span>{formatCurrency(calculations.vat)}</span>
                  </div>
                  <div className="grand-total">
                    <span>Grand Total</span>
                    <span>{formatCurrency(calculations.grand_total)}</span>
                  </div>
                </div>

                <section className="invoice-notes">
                  <ul>
                    {formData.notes.split('\n').filter(line => line.trim()).map((note, index) => (
                      <li key={index}>{note.replace(/^[•-]\s*/, '')}</li>
                    ))}
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
          <div className={`module-toast module-toast-${toast.type}`} role="status" aria-live="polite">
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