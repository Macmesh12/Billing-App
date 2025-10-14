# Billing App - Complete Code Documentation

## Overview
This document explains every major component of the Billing App frontend code, helping you understand what each piece does.

---

## 📄 Invoice Module (`frontend/public/invoice.html`)

### Structure Overview
The invoice page has two modes:
1. **Edit Mode** - Form for entering invoice data
2. **Preview Mode** - Read-only view matching the PDF output

### Key Sections

#### 1. App Header
```html
<header class="app-header">
```
- **Purpose**: Navigation bar at the top of the page
- **Contains**: App branding and links to Dashboard, Invoice, Receipt, Waybill
- **Styling**: Defined in `general.css`

#### 2. Module Header
```html
<div class="module-header">
```
- **Purpose**: Contains page title and action buttons
- **Buttons**:
  - `Preview` - Switches from edit to preview mode
  - `Save Invoice` - Saves to server AND downloads PDF
  - `Back to Edit` - Returns from preview to edit (hidden initially)

#### 3. Invoice Form (Edit Mode)
```html
<form id="invoice-form" class="document document-editable">
```
- **Purpose**: Editable form for entering invoice data
- **Key Elements**:
  - **Letterhead**: Company logo (centered), customer name, invoice number, date
  - **Title**: "PRO-FORMA INVOICE" heading
  - **Items Table**: Dynamic rows for products/services with description, quantity, price, total
  - **Add Item Button**: Adds new row to items table
  - **Summary**: Shows subtotal, taxes (VAT, NHIL, GetFund, COVID), and grand total
  - **Notes**: Textarea for payment terms and conditions
  - **Signature**: Section for signatory name and contact info

#### 4. Invoice Preview (Preview Mode)
```html
<div id="invoice-preview" class="document" hidden>
```
- **Purpose**: Read-only view matching the PDF output
- **Shows**: Same data as edit form but formatted for printing
- **Layout**: Signature and summary appear side-by-side (48% width each)
- **Visibility**: Hidden by default, shown when user clicks "Preview"

---

## 🎨 Invoice Styles (`frontend/static/css/invoice.css`)

### Document Sizing
- **Invoice**: A4 Portrait (210mm × 297mm)
- **PDF Export**: Uses `.pdf-export-wrapper` positioned off-screen for html2pdf.js

### Key Style Sections

#### 1. Logo Styling
```css
.logo-placeholder {
    display: block;
    width: 260px;
    height: 170px;
    margin: 10px auto 0 auto; /* Centers logo horizontally */
    object-fit: contain;
}
```
- **Purpose**: Centers company logo on the invoice
- **Centering**: `margin: auto` centers it horizontally

#### 2. Letterhead Layout
```css
.letterhead-meta {
    display: flex;
    justify-content: space-between;
}
```
- **Purpose**: Positions customer name on left, invoice number/date on right
- **Layout**: Flexbox with space-between

#### 3. Items Table
```css
.document-items {
    width: 100%;
    border-collapse: collapse;
}
```
- **Purpose**: Table for line items
- **Features**: Hover effects, inline inputs in edit mode, formatted display in preview

#### 4. Summary Card
```css
.invoice-summary {
    display: grid;
    margin: 2rem 0 2.0rem auto; /* Pushes to right side */
    max-width: 500px;
    padding: 1.2rem 1.0rem;
    border-radius: 16px;
    background: linear-gradient(...);
}
```
- **Purpose**: Shows subtotal, taxes, and grand total
- **Position**: Right-aligned via `margin: auto`
- **Styling**: Gradient background, rounded corners, shadow

#### 5. Preview Mode: Side-by-Side Layout
```css
.module.is-preview .invoice-summary,
.module.is-preview .invoice-signature {
    display: inline-block;
    vertical-align: top;
    width: 48%;
}
```
- **Purpose**: In preview, signature appears beside summary (not below)
- **Layout**: Each takes 48% width, allowing small gap between them

#### 6. PDF Export Wrapper
```css
.pdf-export-wrapper {
    position: fixed;
    left: -9999px; /* Off-screen */
    width: 210mm;
    min-height: 297mm;
}
```
- **Purpose**: Hidden container for PDF generation
- **Why**: html2pdf.js renders this off-screen element to create the PDF
- **Size**: A4 dimensions (210mm × 297mm)

---

## ⚙️ Invoice JavaScript (`frontend/static/js/invoice.js`)

### Architecture
- **Pattern**: IIFE (Immediately Invoked Function Expression) to avoid global pollution
- **State Management**: `state` object tracks items, levies, invoice number, etc.
- **API Integration**: Communicates with Django backend at `http://127.0.0.1:8765`

### Key Functions

#### 1. Initialization
```javascript
onReady(() => {
    // Code runs when DOM is fully loaded
});
```
- **Purpose**: Ensures DOM is ready before running code
- **Alternative to**: jQuery's `$(document).ready()`

#### 2. Helper Functions
```javascript
formatCurrency(value)
```
- **Purpose**: Converts numbers to currency format (e.g., 1234.5 → "1234.50")
- **Usage**: Displaying prices and totals

```javascript
formatQuantity(value)
```
- **Purpose**: Formats quantities, showing decimals only when needed
- **Example**: 5 → "5", 5.5 → "5.50"

```javascript
parseNumber(value)
```
- **Purpose**: Safely converts strings to numbers
- **Default**: Returns 0 if parsing fails

#### 3. State Object
```javascript
const state = {
    items: [],           // Array of line items
    levies: [],          // Array of tax rules (VAT, NHIL, etc.)
    invoiceId: null,     // ID after saving to server
    invoiceNumber: "INV-001", // Display number
    isSaving: false,     // Prevents double-submission
};
```
- **Purpose**: Central storage for invoice data
- **Items**: Each item has `{ description, quantity, unit_price, total }`
- **Levies**: Each levy has `{ name, rate }` (rate is decimal, e.g., 0.15 for 15%)

#### 4. DOM Element References
```javascript
const elements = {
    itemsPayload: document.getElementById("invoice-items-payload"),
    itemsTableBody: document.querySelector("#invoice-items-table tbody"),
    previewRows: document.getElementById("invoice-preview-rows"),
    subtotal: document.getElementById("invoice-subtotal"),
    // ... many more
};
```
- **Purpose**: Cache DOM elements for quick access
- **Why**: Avoids repeated `document.getElementById()` calls

#### 5. Rendering Functions

**`renderItems()`**
- **Purpose**: Updates both edit table and preview with current items
- **Process**:
  1. Clears existing rows
  2. Creates new rows for each item in `state.items`
  3. Edit mode: Adds input fields
  4. Preview mode: Shows formatted text
  5. Updates hidden JSON payload
  6. Triggers `recalcTotals()`

**`renderLevyPlaceholders()`**
- **Purpose**: Creates levy/tax rows (VAT, NHIL, etc.)
- **Process**:
  1. Reads levy config from `state.levies`
  2. Creates display rows in both edit and preview
  3. Stores element references in Maps for quick updates

**`recalcTotals()`**
- **Purpose**: Recalculates subtotal, taxes, and grand total
- **Process**:
  1. Sum all item totals = subtotal
  2. Calculate each levy: `subtotal * rate`
  3. Grand total = subtotal + all levies
  4. Updates display in both edit and preview

#### 6. Event Handlers

**`handleItemFieldChange(event)`**
- **Triggered by**: Input changes in items table
- **Purpose**: Updates item data and recalculates totals
- **Process**:
  1. Identifies which field changed (description, quantity, unit_price)
  2. Updates `state.items[index]`
  3. If quantity or price changed, calculates `total = qty × price`
  4. Calls `renderItems()` to update display

**`handleAddItem()`**
- **Triggered by**: "Add Item" button click
- **Purpose**: Adds new blank row to items table
- **Process**:
  1. Pushes `{ description: "", quantity: 0, unit_price: 0, total: 0 }` to `state.items`
  2. Calls `renderItems()` to show new row

**`handleRemoveItem(index)`**
- **Triggered by**: "Remove" button click in table row
- **Purpose**: Deletes item from table
- **Process**:
  1. Removes item at index from `state.items`
  2. Calls `renderItems()` to update display

**`handlePreviewToggle()`**
- **Triggered by**: "Preview" button click
- **Purpose**: Switches between edit and preview modes
- **Process**:
  1. Calls `preparePreviewSnapshot()` to sync data
  2. Hides edit form, shows preview document
  3. Adds `is-preview` class to module for styling

**`handleSave()`**
- **Triggered by**: "Save Invoice" button click
- **Purpose**: Saves invoice to server AND downloads PDF
- **Process**:
  1. Validates form (checks required fields)
  2. Calls `preparePreviewSnapshot()` to sync all data
  3. Builds JSON payload with `buildPayload()`
  4. Sends POST/PUT request to `/invoices/api/create/` or `/invoices/api/{id}/`
  5. Updates `state.invoiceId` and `state.invoiceNumber` from response
  6. Calls `downloadInvoicePdf(true)` to generate and download PDF
  7. Shows toast notifications for success/errors

#### 7. API Functions

**`callApi(path, options)`**
- **Purpose**: Makes HTTP requests to Django backend
- **Features**:
  - Automatic JSON headers
  - Error handling with response parsing
  - Returns parsed JSON or null (for 204 No Content)

**`calculateServerTotals()`**
- **Purpose**: Gets precise totals from server (using Decimal math)
- **Why**: Avoids JavaScript floating-point errors
- **Endpoint**: `POST /invoices/api/calculate-preview/`
- **Note**: Debounced to avoid excessive API calls

#### 8. PDF Generation

**`preparePreviewSnapshot()`**
- **Purpose**: Syncs all form data to preview before PDF generation
- **Process**:
  1. Calls `renderItems()` to update items table
  2. Calls `syncPreviewFromForm()` to copy all input values
  3. Calls `calculateServerTotals()` for accurate numbers

**`downloadInvoicePdf(prepared)`**
- **Purpose**: Generates and downloads PDF using html2pdf.js
- **Process**:
  1. Creates hidden clone of preview document
  2. Wraps clone in `.pdf-export-wrapper` (positioned off-screen)
  3. Removes all IDs from clone (prevents duplicates)
  4. Configures html2pdf.js:
     - **Page**: A4 portrait
     - **Margins**: 10mm all around
     - **Scale**: 2 (high quality)
     - **Images**: Enable CORS, JPEG quality 0.98
  5. Calls `html2pdf().from(wrapper).save()`
  6. Removes clone after PDF is generated
- **Filename**: Uses invoice number (e.g., "INV-001.pdf")

**Why Clone?**
- Prevents modifying the visible preview
- Allows removing IDs (html2pdf.js can have issues with duplicate IDs)
- Can be styled differently via `.pdf-export-wrapper` class

#### 9. Preview Sync Functions

**`syncPreviewFromForm()`**
- **Purpose**: Copies all input values to preview display
- **Fields Synced**:
  - Customer name
  - Issue date
  - Company info
  - Client reference
  - Introduction text
  - Notes (via `renderPreviewNotes()`)

**`renderPreviewNotes(notesText)`**
- **Purpose**: Converts textarea notes into bulleted list
- **Process**:
  1. Splits notes by line breaks
  2. Removes leading bullets/dashes (user might add them)
  3. Creates `<li>` element for each line
  4. Shows "Add notes to display terms" if empty

**`valueOrPlaceholder(field, fallback)`**
- **Purpose**: Returns field value or placeholder if empty
- **Why**: Preview should show placeholders like edit mode

#### 10. Debouncing

**`debounce(fn, delay)`**
- **Purpose**: Limits how often a function runs
- **Usage**: `debouncedServerTotals` waits 300ms after last input change
- **Why**: Avoids hammering server with API calls on every keystroke

#### 11. Module Lifecycle

**Initialization Flow**:
1. Wait for DOM ready
2. Cache all element references
3. Load config from server (`/invoices/api/config/`)
4. Render levy placeholders
5. Add one initial item
6. Attach event listeners

**Edit → Preview Flow**:
1. User clicks "Preview"
2. `handlePreviewToggle()` runs
3. `preparePreviewSnapshot()` syncs all data
4. Form hidden, preview shown
5. "Back to Edit" button appears

**Save Flow**:
1. User clicks "Save Invoice"
2. `handleSave()` validates form
3. Prepares preview snapshot
4. Sends data to server
5. Receives invoice ID and number
6. Calls `downloadInvoicePdf(true)`
7. PDF downloads automatically
8. Toast notification shows status

---

## 📝 Receipt Module (`frontend/public/receipt.html`)

### Document Size
- **Format**: A5 Landscape (210mm × 148mm)
- **Why**: Receipts are typically smaller than invoices

### Structure
1. **Letterhead**: Three columns (Date/Location | Title | Company Name)
2. **Body**: Received from, description, amount paid, payment method
3. **Highlights**: Total invoice amount, balance after payment
4. **Signature**: Signatory name and contact

### Key Differences from Invoice
- No line items table (single payment amount instead)
- Simpler layout optimized for A5 landscape
- Focuses on payment details rather than itemized billing

---

## 📦 Waybill Module (`frontend/public/waybill.html`)

### Document Size
- **Format**: A5 Landscape (210mm × 148mm)
- **Why**: Delivery documents are typically smaller

### Structure
1. **Letterhead**: Three columns (ATTN | Title | Destination/Date)
2. **Note**: Acknowledgement text (e.g., "Please sign for acceptance")
3. **Items Table**: Goods being delivered (description, quantity, unit price, total)
4. **Signatures**: Two cards (Delivered By | Received By)

### Key Differences from Invoice
- Focus on delivery, not billing
- Signature grid for both parties (sender and receiver)
- ATTN field instead of "Billed To"

---

## 🎨 Global Styles (`frontend/static/css/general.css`)

### CSS Variables
```css
:root {
    --primary: #1f6feb;
    --accent: #0969da;
    --text: #101828;
    --muted: #667085;
    --background: #f9fafb;
}
```
- **Purpose**: Centralized color scheme
- **Usage**: `color: var(--primary);`
- **Benefit**: Easy theme changes

### Module Framework
```css
.module {
    /* Base module styles */
}

.module.is-preview {
    /* Preview mode overrides */
}
```
- **Purpose**: Consistent layout for all document types
- **Classes**:
  - `.module` - Base container
  - `.module-header` - Title and buttons
  - `.module-body` - Form and preview area
  - `.module-actions` - Button group
  - `.is-preview` - Preview mode modifier

### Button Styles
```css
.button {
    /* Primary button (Save) */
}

.button-secondary {
    /* Secondary button (Preview) */
}
```
- **Purpose**: Consistent button styling
- **States**: Default, hover, active, disabled

### Toast Notifications
```css
.module-toast {
    /* Toast container */
}

.module-toast.is-error {
    /* Error state (red) */
}

.module-toast.is-success {
    /* Success state (green) */
}
```
- **Purpose**: User feedback for actions
- **Timing**: Auto-hide after 4 seconds
- **Usage**: Shown after save, PDF generation, errors

---

## 🔧 Common Patterns

### 1. Form Validation
```javascript
if (!inputs.customer?.value) {
    showToast("Please enter customer name", "error");
    return;
}
```
- **Purpose**: Check required fields before submission
- **User Feedback**: Toast message explaining error

### 2. State Updates
```javascript
state.items.push(newItem);  // Add to state
renderItems();               // Update UI
```
- **Pattern**: Modify state, then re-render
- **Why**: Keeps data and display in sync

### 3. API Calls
```javascript
try {
    const result = await callApi("/path/", { method: "POST", body: JSON.stringify(data) });
    // Handle success
} catch (error) {
    showToast(`Error: ${error.message}`, "error");
}
```
- **Pattern**: Try-catch with user-friendly error messages
- **Why**: Graceful error handling

### 4. Event Delegation
```javascript
form.addEventListener("input", (event) => {
    if (event.target.dataset.field) {
        handleItemFieldChange(event);
    }
});
```
- **Purpose**: Single listener for all inputs
- **How**: Checks if target has `data-field` attribute
- **Benefit**: Works for dynamically added rows

---

## 📐 Responsive Design

### Breakpoints
- **Desktop**: > 900px (default styles)
- **Tablet/Mobile**: ≤ 900px (media queries)

### Mobile Adjustments
```css
@media (max-width: 900px) {
    .letterhead-meta {
        flex-direction: column; /* Stack vertically */
    }
}
```
- **Changes**: Stack columns, reduce padding, simplify layouts
- **Goal**: Usable on small screens (though primarily desktop app)

---

## 🔐 Security Notes

### CSRF Protection
- **Current**: Disabled (`@csrf_exempt` in Django)
- **Reason**: Desktop app, local-only server
- **Production**: Would need CSRF tokens for web deployment

### Input Validation
- **Client**: Basic HTML5 validation (`required` attributes)
- **Server**: Django forms validate all inputs
- **Both**: Prevents invalid data from reaching database

---

## 🐛 Common Issues and Solutions

### Issue: PDF doesn't download
**Cause**: html2pdf.js not loaded or CORS errors
**Solution**: Check browser console for errors, verify CDN is accessible

### Issue: Logo doesn't appear in PDF
**Cause**: CORS policy blocks loading image
**Solution**: Ensure logo is served from same domain or has CORS headers

### Issue: Totals don't calculate
**Cause**: JavaScript error or missing levy config
**Solution**: Check console for errors, verify `/api/config/` returns levy data

### Issue: Invoice number doesn't update after save
**Cause**: API response doesn't include invoice number
**Solution**: Check server response format, ensure it includes `invoice_number` field

### Issue: Preview looks different from PDF
**Cause**: CSS differences between `.document` and `.pdf-export-wrapper`
**Solution**: Both should use same styles, check for conflicting CSS rules

---

## 🚀 Adding New Features

### Example: Add a New Field

1. **HTML** - Add input in edit form:
```html
<label class="field-block">
    <span>New Field:</span>
    <input type="text" id="invoice-new-field" name="new_field">
</label>
```

2. **HTML** - Add display in preview:
```html
<p><strong>New Field:</strong> <span id="invoice-preview-new-field">—</span></p>
```

3. **JavaScript** - Cache element:
```javascript
const elements = {
    // ... existing
    previewNewField: document.getElementById("invoice-preview-new-field"),
};

const inputs = {
    // ... existing
    newField: document.getElementById("invoice-new-field"),
};
```

4. **JavaScript** - Sync in `syncPreviewFromForm()`:
```javascript
elements.previewNewField && (elements.previewNewField.textContent = inputs.newField?.value || "—");
```

5. **JavaScript** - Include in `buildPayload()`:
```javascript
return {
    // ... existing fields
    new_field: inputs.newField?.value || "",
};
```

6. **Backend** - Add field to Django model and form
7. **Backend** - Run `python manage.py makemigrations` and `migrate`

---

## 📚 Key Takeaways

1. **IIFE Pattern**: Wraps code to avoid global scope pollution
2. **State Management**: Central `state` object tracks all data
3. **Render Functions**: Update UI from state (unidirectional data flow)
4. **Event Delegation**: Single listener handles dynamic content
5. **API Integration**: Backend handles business logic, frontend handles UI
6. **PDF Generation**: Client-side using html2pdf.js for instant downloads
7. **Preview Fidelity**: Preview uses same HTML/CSS as PDF export
8. **Separation of Concerns**: HTML structure, CSS styling, JS behavior
9. **Progressive Enhancement**: Works without JavaScript (basic form submission)
10. **Accessibility**: Proper labels, ARIA attributes, semantic HTML

---

## 🎓 Learning Path

**If you want to understand:**

- **HTML Structure** → Read `invoice.html` comments
- **Styling** → Read `invoice.css` comments, examine CSS variables in `general.css`
- **Interactivity** → Study `invoice.js`, start with `renderItems()` and `handleSave()`
- **API Integration** → Look at `callApi()`, `handleSave()`, `calculateServerTotals()`
- **PDF Generation** → Study `downloadInvoicePdf()` and html2pdf.js docs
- **Module Pattern** → Compare invoice.js, receipt.js, waybill.js structures

---

## 📞 Need Help?

**Debugging Steps:**
1. Open browser DevTools (F12)
2. Check Console tab for JavaScript errors
3. Check Network tab for failed API calls
4. Use `console.log()` to inspect state at any point
5. Verify backend is running on `http://127.0.0.1:8765`

**Common Commands:**
```bash
# Start Django server
cd backend
python manage.py runserver 127.0.0.1:8765

# Run tests
python manage.py test invoices

# Check for errors
python manage.py check
```

---

This documentation covers the core concepts. Each code file now has inline comments explaining specific lines!
