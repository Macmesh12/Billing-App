Offline usage guide

This project now supports fully local document creation, edit and PDF export without a running backend.

Quick start (Flutter dev):

1. Add new dependencies and fetch:

```bash
cd billdoc
flutter pub get
```

2. Example usage (from Flutter code):

```dart
final repo = InvoiceRepository();
// Create invoice and save locally
final invoice = Invoice(...);
await repo.createInvoice(invoice);

// List invoices
final all = await repo.getAllInvoices();

// Open invoice and edit, then update
final inv = await repo.getInvoiceById(all.first.invoiceNumber);
await repo.updateInvoice(inv.invoiceNumber, inv.copyWith(customerName: 'New'));

// Export all invoices to JSON string
final json = await repo.exportAll();

// Generate PDF and get file path
final path = await PdfService.generateAndSave(inv);
```

Files saved to app documents directory; you can share exported JSON files between machines if needed.
