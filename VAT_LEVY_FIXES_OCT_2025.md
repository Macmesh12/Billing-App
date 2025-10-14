# VAT & Levy Fixes - October 14, 2025

## Issues Fixed

### 1. ✅ Removed VAT from Levies List

**Problem:**
- VAT (15%) was incorrectly included in the levies array alongside NHIL, GETFund, and COVID levies
- This caused VAT to be calculated on the subtotal instead of on (subtotal + levies)

**Solution:**
- Added filter to remove VAT from levies array when loading config
- VAT is now calculated separately after levies are computed

**Code Changes in `invoice.js`:**
```javascript
// OLD - VAT was in levies
state.levies = [
    { name: "NHIL", rate: 0.025 },
    { name: "GETFund Levy", rate: 0.025 },
    { name: "COVID", rate: 0.01 },
    { name: "VAT", rate: 0.15 },  // ❌ Should not be here
];

// NEW - VAT removed, calculated separately
state.levies = state.levies.filter(levy => levy.name.toUpperCase() !== "VAT");
state.levies = [
    { name: "NHIL", rate: 0.025 },
    { name: "GETFund Levy", rate: 0.025 },
    { name: "COVID", rate: 0.01 },
];
// VAT is now calculated separately as 15% of (Subtotal + Levies)
```

### 2. ✅ Changed "Total Levies" to "Total Levies + Value"

**Problem:**
- Label said "Total Levies" but showed only the sum of levy amounts
- Should show "Total Levies + Value" meaning (Subtotal + Sum of Levies)

**Solution:**
- Updated label in both edit and preview sections
- Updated calculation to show subtotal + levies sum

**HTML Changes:**
```html
<!-- OLD -->
<span>Total Levies</span>
<span id="invoice-levy-total">0.00</span>

<!-- NEW -->
<span>Total Levies + Value</span>
<span id="invoice-levy-total">0.00</span>
```

**JavaScript Calculation:**
```javascript
// Calculate individual levies
let levyTotal = 0;
state.levies.forEach(({ name, rate }) => {
    const amount = subtotal * rate;
    levyTotal += amount;
});

// Total Levies + Value = Subtotal + Sum of Levies
const totalLeviesAndValue = subtotal + levyTotal;
elements.levyTotal.textContent = formatCurrency(totalLeviesAndValue);

// VAT is 15% of (Subtotal + Levies)
const vat = totalLeviesAndValue * 0.15;

// Grand Total = Subtotal + Levies + VAT
const grandTotal = subtotal + levyTotal + vat;
```

### 3. ✅ Fixed PDF Generation Issues

**Problem:**
- PDF wrapper padding didn't match preview
- Potential overflow issues in PDF

**Solution:**
- Updated PDF wrapper padding to match preview (8mm 10mm)
- Added `overflow: visible` to ensure all content is captured
- Ensured consistent styling between preview and PDF export

**CSS Changes:**
```css
.pdf-export-wrapper .document {
    width: 210mm !important;
    height: 297mm !important;
    padding: 8mm 10mm !important;  /* Matches preview */
    overflow: visible !important;  /* Capture all content */
}
```

## New Calculation Flow

### Example Invoice:
```
Item 1: 100.00 GHC
Item 2: 50.00 GHC
```

### Step-by-Step Calculation:

1. **Subtotal (Without VAT)**
   ```
   = 100.00 + 50.00
   = 150.00 GHC
   ```

2. **Individual Levies (on Subtotal)**
   ```
   NHIL (2.5%)      = 150.00 × 0.025 = 3.75 GHC
   GETFund (2.5%)   = 150.00 × 0.025 = 3.75 GHC
   COVID (1.0%)     = 150.00 × 0.010 = 1.50 GHC
   ```

3. **Total Levies + Value** ← This is what's displayed
   ```
   = Subtotal + (NHIL + GETFund + COVID)
   = 150.00 + (3.75 + 3.75 + 1.50)
   = 150.00 + 9.00
   = 159.00 GHC
   ```

4. **VAT (15%)**
   ```
   = (Subtotal + Total Levies) × 0.15
   = 159.00 × 0.15
   = 23.85 GHC
   ```

5. **Grand Total**
   ```
   = Subtotal + Total Levies + VAT
   = 150.00 + 9.00 + 23.85
   = 182.85 GHC
   ```

## Display Structure

### Invoice Summary Section:
```
┌─────────────────────────────────────────┐
│ Sub Total (Without VAT)      150.00 GHC │
│                                          │
│ NHIL (2.5%)                    3.75 GHC │
│ GETFund Levy (2.5%)            3.75 GHC │
│ COVID (1%)                     1.50 GHC │
├─────────────────────────────────────────┤
│ Total Levies + Value         159.00 GHC │ ← Subtotal + Levies
│ VAT (15%)                     23.85 GHC │ ← 15% of above
├═════════════════════════════════════════┤
│ Grand Total                  182.85 GHC │
└─────────────────────────────────────────┘
```

## Files Modified

### 1. `frontend/static/js/invoice.js`
- Filtered out VAT from levies array (line ~549)
- Updated fallback levies to exclude VAT (line ~550-558)
- Changed calculation to show "Total Levies + Value" (line ~364-366)
- Updated VAT calculation to use totalLeviesAndValue (line ~368-370)

### 2. `frontend/public/invoice.html`
- Updated label from "Total Levies" to "Total Levies + Value" (edit section)
- Updated label from "Total Levies" to "Total Levies + Value" (preview section)

### 3. `frontend/static/css/general.css`
- Updated PDF wrapper padding from `10mm 12mm` to `8mm 10mm`
- Added `overflow: visible` to PDF export wrapper

## Testing Checklist

- [x] VAT no longer appears in individual levies list
- [x] Only NHIL, GETFund, and COVID show in levies
- [x] "Total Levies + Value" label displays correctly
- [x] "Total Levies + Value" shows subtotal + levies sum
- [x] VAT (15%) calculated on (subtotal + levies)
- [x] Grand Total = Subtotal + Levies + VAT
- [x] PDF generates without errors
- [x] PDF layout matches preview
- [x] All content fits in PDF

## Verification

To verify the calculations are correct:

1. Add items totaling 150.00 GHC
2. Check calculations:
   - Subtotal: 150.00
   - NHIL: 3.75
   - GETFund: 3.75
   - COVID: 1.50
   - Total Levies + Value: 159.00 (150 + 9)
   - VAT: 23.85 (159 × 0.15)
   - Grand Total: 182.85

## Important Notes

1. **VAT is NOT a levy** - It's a separate tax calculated after levies
2. **"Total Levies + Value"** means Subtotal + Sum of all levies (NHIL + GETFund + COVID)
3. **VAT base** is the "Total Levies + Value" amount
4. **Grand Total** includes everything: Subtotal + Levies + VAT

## Formula Reference

```
Subtotal = Sum of all line items

Levy₁ = Subtotal × Levy₁_Rate
Levy₂ = Subtotal × Levy₂_Rate
Levy₃ = Subtotal × Levy₃_Rate
...
Total_Levies = Levy₁ + Levy₂ + Levy₃ + ...

Total_Levies_And_Value = Subtotal + Total_Levies

VAT = Total_Levies_And_Value × 0.15

Grand_Total = Subtotal + Total_Levies + VAT
            = Total_Levies_And_Value + VAT
```

## Backward Compatibility

✅ **Fully Compatible**
- Existing invoices will recalculate correctly
- No database changes required
- No API changes required
- Old invoices will use new calculation automatically

---

**Update Date:** October 14, 2025  
**Updated By:** AI Assistant  
**Version:** 2.2.0  
**Related:** INVOICE_IMPROVEMENTS_OCT_2025.md
