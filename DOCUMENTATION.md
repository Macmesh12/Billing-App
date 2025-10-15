# Billing App - Code Documentation Guide

## Overview
This document provides an overview of the code documentation standards and organization used throughout the Billing App codebase.

## Documentation Standards

### JavaScript Files

#### Module Structure
All JavaScript modules follow a consistent structure:

```javascript
/* ============================================
   MODULE NAME - PURPOSE
   ============================================
   Brief description of module functionality
   ============================================ */

// IIFE to encapsulate module logic
(function () {
    // ============================================
    // SECTION NAME
    // ============================================
    
    /**
     * Function Description
     * @param {type} paramName - Parameter description
     * @returns {type} Return value description
     */
    function exampleFunction(paramName) {
        // Implementation
    }
})();
```

#### Key Conventions
- **Module headers**: Describe the overall purpose and main features
- **Section headers**: Organize code into logical sections (initialization, helpers, rendering, etc.)
- **JSDoc-style comments**: For all functions, including parameter types and return values
- **Inline comments**: Strategic comments for complex logic, avoiding over-commenting

### Python Files

#### Module Structure
Python modules follow Google-style docstring conventions:

```python
"""
Module Name

Brief description of the module's purpose and key functionality.
"""

class ExampleClass:
    """
    Class description.
    
    Attributes:
        attr_name: Description of attribute
    """
    
    def example_method(self, param: str) -> str:
        """
        Method description.
        
        Args:
            param: Description of parameter
            
        Returns:
            Description of return value
            
        Examples:
            >>> example_method("test")
            'result'
        """
        return result
```

#### Key Conventions
- **Module docstrings**: At the top of each file
- **Class docstrings**: Describe purpose and key attributes
- **Method docstrings**: Include Args, Returns, and Examples sections when helpful
- **Type hints**: Use Python 3.10+ type hints for parameters and return values
- **Inline comments**: Explain "why" not "what" for non-obvious code

## File Organization

### Frontend Structure

```
frontend/
├── static/
│   ├── css/
│   │   ├── general.css      # Base styles for all documents
│   │   ├── invoice.css      # Invoice-specific styles
│   │   ├── receipt.css      # Receipt-specific styles
│   │   └── waybill.css      # Waybill-specific styles
│   └── js/
│       ├── main.js          # Global utilities and helpers
│       ├── home.js          # Dashboard/home page logic
│       ├── invoice.js       # Invoice module (line items, calculations)
│       ├── receipt.js       # Receipt module (payments, balances)
│       └── waybill.js       # Waybill module (shipping items)
└── templates/
    └── ...                  # Django templates
```

### Backend Structure

```
backend/
├── billing_app/
│   ├── settings.py          # Django settings (tax rates, etc.)
│   ├── pdf_api.py           # PDF/JPEG rendering API
│   ├── counter_api.py       # Document number counter API
│   ├── invoices/
│   │   ├── api.py           # Invoice REST endpoints
│   │   ├── forms.py         # Invoice form validation
│   │   ├── models.py        # Invoice database model
│   │   └── services/
│   │       ├── calculator.py    # Tax/levy calculations
│   │       └── numbering.py     # Number formatting
│   ├── receipts/
│   │   └── ...              # Similar structure to invoices
│   └── waybills/
│       └── ...              # Similar structure to invoices
└── ...
```

## Module Responsibilities

### Frontend Modules

#### invoice.js
- **Purpose**: Manage invoice creation and editing
- **Key Features**:
  - Line item management (add, edit, remove)
  - Real-time tax and levy calculations
  - Preview mode with live sync
  - PDF/JPEG export
  - Document number reservation

#### receipt.js
- **Purpose**: Manage receipt creation and editing
- **Key Features**:
  - Line item management for received goods
  - Balance calculation (total - amount paid)
  - Preview mode
  - PDF/JPEG export
  - Document number reservation

#### waybill.js
- **Purpose**: Manage waybill/delivery note creation
- **Key Features**:
  - Shipped item management
  - Delivery information tracking
  - Preview mode
  - PDF/JPEG export
  - Document number reservation

#### main.js
- **Purpose**: Global utilities shared across all modules
- **Key Features**:
  - Currency formatting
  - Number parsing
  - Preview mode toggle
  - Download format chooser dialog

#### home.js
- **Purpose**: Dashboard statistics and navigation
- **Key Features**:
  - Animated document count display
  - API integration for counts
  - Action card hover effects

### Backend Services

#### calculator.py
- **Purpose**: Invoice total calculations
- **Uses Decimal for precision**: Avoids floating-point errors
- **Applies tax rates**: From settings.TAX_SETTINGS

#### numbering.py
- **Purpose**: Format document numbers
- **Format**: PREFIX + zero-padded number (e.g., INV001)
- **Prefixes**: INV (invoice), REC (receipt), WAY (waybill)

#### forms.py
- **Purpose**: Validate and parse form data
- **Handles JSON**: Line items stored as JSON strings
- **Custom numbers**: Supports custom document numbering

#### api.py
- **Purpose**: REST API endpoints
- **CORS enabled**: For Electron integration
- **JSON responses**: Consistent response format

## Best Practices

### When Adding New Features

1. **Follow existing patterns**: Use the same structure as similar modules
2. **Document as you code**: Add docstrings/comments while implementing
3. **Section your code**: Use clear section headers to organize
4. **Type your code**: Use type hints in Python, JSDoc in JavaScript
5. **Keep it DRY**: Extract reusable logic to helper functions

### Code Review Checklist

- [ ] All public functions have docstrings/JSDoc comments
- [ ] Complex logic has explanatory inline comments
- [ ] Module header describes purpose and key features
- [ ] Code is organized into logical sections
- [ ] Type information is provided for parameters and returns
- [ ] Examples are included for non-obvious functions

### Documentation Maintenance

- **Update on changes**: When functionality changes, update the documentation
- **Remove obsolete comments**: Delete outdated comments during refactoring
- **Keep it current**: Documentation that's wrong is worse than no documentation

## Common Patterns

### API Calls (JavaScript)
```javascript
async function callApi(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        headers: { "Content-Type": "application/json", ...options.headers },
        ...options,
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.status === 204 ? null : response.json();
}
```

### Toast Notifications (JavaScript)
```javascript
function showToast(message, tone = "success") {
    const el = elements.toast;
    if (!el) return;
    el.textContent = message;
    el.className = `module-toast is-${tone}`;
    el.hidden = false;
    setTimeout(() => el.hidden = true, 4000);
}
```

### Form Validation (Python)
```python
def save(self, commit=True):
    instance = super().save(commit=False)
    # Custom processing
    if commit:
        instance.save()
    return instance
```

## Additional Resources

- **Django Documentation**: https://docs.djangoproject.com/
- **WeasyPrint (PDF)**: https://weasyprint.org/
- **Electron**: https://www.electronjs.org/
- **JSDoc**: https://jsdoc.app/

## Contributing

When contributing to this project:

1. Read and follow the existing documentation standards
2. Add documentation for all new code
3. Update documentation when modifying existing code
4. Include examples in docstrings for complex functions
5. Keep comments concise but informative

## Questions?

If you have questions about the documentation standards or need clarification on any module, please:
1. Check this guide first
2. Review similar existing code
3. Ask in the project discussion/issues
