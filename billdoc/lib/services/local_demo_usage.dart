import 'package:flutter/material.dart';
import 'invoice_repository.dart';
import 'pdf_service.dart';
import '../models/invoice.dart';

/// Small example usage of local repository + pdf saving
class LocalDemo {
  final InvoiceRepository repo = InvoiceRepository();

  Future<void> createAndSavePdfDemo() async {
    final invoice = Invoice(
      invoiceNumber: Invoice.generateInvoiceNumber(),
      date: DateTime.now().toIso8601String(),
      customerName: 'Demo Customer',
      issuer: 'Local User',
      items: [
        InvoiceItem(description: 'Product A', quantity: 2, unitPrice: 10.0),
        InvoiceItem(description: 'Product B', quantity: 1, unitPrice: 5.5),
      ],
    );

    final id = await repo.createInvoice(invoice);
    final path = await PdfService.generateAndSave(invoice);
    print('Saved invoice $id to $path');
  }
}
