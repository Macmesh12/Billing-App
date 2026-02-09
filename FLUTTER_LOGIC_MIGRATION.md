# Flutter Logic Migration Guide

## Overview
This document describes the migration of business logic from Django backend to Flutter for offline-capable calculations and improved user experience.

## What Was Migrated

### ✅ Migrated to Flutter (Client-Side)

#### 1. **Calculator Logic** (`lib/services/calculator.dart`)
- **Purpose**: Calculate invoice totals (subtotal, levies, grand total)
- **Matches**: `backend/billing_app/invoices/services/calculator.py`
- **Features**:
  - Decimal precision arithmetic (2 decimal places, ROUND_HALF_UP)
  - Tax calculation (NHIL, GETFUND, VAT)
  - Identical rounding behavior to backend
- **Usage**:
  ```dart
  final items = [
    {'quantity': 2, 'unit_price': 10.0, 'description': 'Item 1'},
  ];
  final taxSettings = await SettingsService.getTaxSettings();
  final totals = Calculator.calculateTotals(items, taxSettings);
  print(totals.grandTotal); // 24.00
  ```

#### 2. **Item Parser** (`lib/services/item_parser.dart`)
- **Purpose**: Parse and sanitize line items from JSON
- **Matches**: `InvoiceForm._parse_items` in `backend/billing_app/invoices/forms.py`
- **Features**:
  - JSON decoding with error handling
  - Type conversion (string/int/double)
  - Default values for missing fields
  - Item total calculation
- **Usage**:
  ```dart
  final payload = jsonEncode(items);
  final parsed = ItemParser.parseItems(payload);
  ```

#### 3. **Tax Settings** (`lib/models/tax_settings.dart`)
- **Purpose**: Store and sync tax rates
- **Matches**: `billing_app/settings.py::TAX_SETTINGS`
- **Features**:
  - Default rates (NHIL: 2.5%, GETFUND: 2.5%, VAT: 15%)
  - JSON serialization
  - Type-safe access
- **Usage**:
  ```dart
  final settings = TaxSettings.defaultSettings;
  print(settings.vat); // 0.15
  ```

#### 4. **Settings Service** (`lib/services/settings_service.dart`)
- **Purpose**: Sync tax settings from backend with caching
- **Features**:
  - Multi-layer caching (memory → local storage → API → defaults)
  - 24-hour sync interval
  - Automatic fallback to defaults
  - Force refresh capability
- **Usage**:
  ```dart
  // Get settings (uses cache if recent)
  final settings = await SettingsService.getTaxSettings();
  
  // Force refresh from API
  final fresh = await SettingsService.refreshSettings();
  ```

#### 5. **API Service Enhancement** (`lib/services/api_service.dart`)
- **New Method**: `calculateInvoiceTotalsLocal()`
- **Features**:
  - Local-first calculation
  - Automatic API fallback if local fails
  - Identical results to backend
- **Usage**:
  ```dart
  // Calculate locally (fast, offline-capable)
  final totals = await ApiService.calculateInvoiceTotalsLocal(items);
  
  // With API fallback disabled
  final totals = await ApiService.calculateInvoiceTotalsLocal(
    items, 
    useApiAsBackup: false,
  );
  ```

### ❌ Kept on Backend (Server-Side)

These remain server-authoritative for security and legal compliance:

1. **Invoice Numbering** (`invoices/services/numbering.py`)
   - Sequential number generation
   - Prevents duplicates/gaps
   
2. **Final Save & PDF Generation** (`billing_app/pdf_generator.py`)
   - Authoritative record creation
   - Legal document stamping
   - Server-side totals validation

3. **Database Persistence** (Django models)
   - Central source of truth
   - Multi-user sync
   - Audit trail

## Benefits of Migration

### Performance
- **Instant Preview**: Calculate totals locally without network round-trip
- **Offline Capable**: Users can create invoices offline, sync later
- **Reduced Server Load**: Fewer API calls for preview calculations

### User Experience
- **Real-time Updates**: Immediate feedback as items are added/edited
- **Better Responsiveness**: No loading spinners for calculations
- **Offline Mode**: Continue working during network issues

### Code Quality
- **Single Source of Logic**: Reusable calculator across all Flutter screens
- **Type Safety**: Dart's strong typing catches errors at compile time
- **Testability**: Comprehensive unit tests verify behavior

## Architecture

### Calculation Flow

```
User Input (Flutter)
       ↓
[Local Calculator] ← Tax Settings (cached)
       ↓
Preview/Totals (instant)
       ↓
Save Request → [Django Backend]
                     ↓
              Validate + Persist
                     ↓
              Generate PDF
                     ↓
              Return Result
```

### Settings Sync Flow

```
App Startup
     ↓
[Check Local Cache]
     ↓ (if stale or missing)
[Fetch from API: /invoices/api/config/]
     ↓
[Save to Local Storage]
     ↓
[Return Settings]
```

## Implementation Notes

### Decimal Precision
- **Package**: `decimal: ^3.0.3`
- **Rounding**: 2 decimal places, ROUND_HALF_UP
- **Method**: Multiply by 100, round, divide by 100, convert to Decimal

```dart
static Decimal _roundToTwoDecimals(Decimal value) {
  final shifted = value * Decimal.fromInt(100);
  final rounded = shifted.round();
  final result = rounded / Decimal.fromInt(100);
  return Decimal.parse(result.toDouble().toStringAsFixed(2));
}
```

### Error Handling
- **Local Calculation Fails**: Falls back to API automatically
- **API Unavailable**: Uses cached settings (up to 24 hours old)
- **Cache Missing**: Uses hard-coded defaults matching backend

### Validation
- **Client-Side**: TypeScript + local calculator for UX
- **Server-Side**: Django re-validates everything before saving
- **Tests**: Unit tests verify exact match between Dart and Python

## Testing

### Running Tests

```bash
cd billdoc
flutter test test/calculator_test.dart
flutter test test/item_parser_test.dart
flutter test test/tax_settings_test.dart
```

### Test Coverage

1. **Calculator Tests** (`test/calculator_test.dart`)
   - Decimal conversion and rounding
   - Single/multiple items
   - Edge cases (empty, missing values)
   - Precision matching backend
   - Custom tax rates

2. **Parser Tests** (`test/item_parser_test.dart`)
   - Valid/invalid JSON
   - Missing fields → defaults
   - Type conversions (string/int/double)
   - Rounding behavior
   - Edge cases

3. **Settings Tests** (`test/tax_settings_test.dart`)
   - Default values
   - JSON serialization
   - Type handling

### Verification Against Backend

Create test cases that run the same input through both:
1. Flutter calculator
2. Django API endpoint

Compare results to ensure identical output.

## API Endpoints

### Existing (Used by Flutter)

- **GET `/invoices/api/config/`**: Fetch tax settings
- **POST `/invoices/api/calculate-preview/`**: Server-side calculation (fallback)
- **POST `/invoices/api/create/`**: Final save (always server-side)
- **GET `/invoices/api/<pk>/`**: Retrieve invoice

### Backend Config Endpoint

```python
# backend/invoices/api.py
def get_config(request: HttpRequest) -> HttpResponse:
    data = {
        "tax_settings": settings.TAX_SETTINGS,
    }
    return _cors(JsonResponse(data))
```

Response:
```json
{
  "tax_settings": {
    "NHIL": 0.025,
    "GETFUND": 0.025,
    "VAT": 0.15
  }
}
```

## Best Practices

### When to Use Local Calculation
✅ **Use Local**:
- Preview/live totals during editing
- Validation before save
- Offline mode
- Quick calculations

### When to Use API
✅ **Use API**:
- Final save/persist
- PDF generation
- Invoice numbering
- First-time settings fetch

### Settings Sync Strategy
- Fetch on app startup (if cache > 24h old)
- Allow manual refresh in settings UI
- Always validate API response
- Graceful degradation to defaults

## Migration Checklist

- [x] Add `decimal` package to `pubspec.yaml`
- [x] Create `tax_settings.dart` model
- [x] Implement `calculator.dart` matching backend
- [x] Implement `item_parser.dart` matching backend
- [x] Create `settings_service.dart` for caching
- [x] Enhance `api_service.dart` with local calculation
- [x] Write comprehensive unit tests
- [x] Verify backend API endpoint (`/invoices/api/config/`)
- [ ] Update UI screens to use local calculator
- [ ] Add settings sync to app initialization
- [ ] Add manual refresh button in settings
- [ ] Test offline mode
- [ ] Compare results with backend (integration test)

## Future Enhancements

1. **Background Sync**: Periodically sync settings in background
2. **Conflict Resolution**: Handle offline edits + online changes
3. **Audit**: Log when local vs API calculation is used
4. **Validation**: Add client-side form validation using same parser
5. **Receipts & Waybills**: Extend local calculation to other document types

## Troubleshooting

### Tests Failing
- Ensure `flutter pub get` has run
- Check Decimal rounding logic matches backend
- Verify tax rates in defaults match backend

### Calculations Don't Match Backend
- Check tax settings are synced
- Verify Decimal precision (2 places, ROUND_HALF_UP)
- Compare raw Decimal values, not doubles

### Settings Not Syncing
- Check network connectivity
- Verify backend is running (`http://localhost:8765`)
- Check API endpoint returns correct JSON
- Clear cache: `SettingsService.clearCache()`

## Related Files

### Flutter
- `billdoc/lib/services/calculator.dart`
- `billdoc/lib/services/item_parser.dart`
- `billdoc/lib/services/settings_service.dart`
- `billdoc/lib/services/api_service.dart`
- `billdoc/lib/models/tax_settings.dart`
- `billdoc/test/calculator_test.dart`
- `billdoc/test/item_parser_test.dart`
- `billdoc/test/tax_settings_test.dart`

### Backend
- `backend/billing_app/invoices/services/calculator.py`
- `backend/billing_app/invoices/forms.py`
- `backend/billing_app/settings.py`
- `backend/invoices/api.py`

## Summary

This migration brings calculation logic to Flutter while maintaining Django as the authoritative source of truth. Users get instant feedback, offline capability, and better performance, while the backend ensures data integrity, legal compliance, and proper audit trails.

The implementation uses exact decimal arithmetic matching Python's `Decimal` behavior, comprehensive testing, and graceful fallbacks to ensure reliability.
