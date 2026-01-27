/// API Service Usage Examples
/// 
/// This file demonstrates how to use the ApiService to interact with the Django backend.
/// All examples include proper error handling.

import 'api_service.dart';
import 'dart:io';

/// Example: Invoice Operations
class InvoiceExamples {
  /// Calculate invoice totals before saving (preview)
  static Future<void> calculateInvoicePreview() async {
    try {
      final result = await ApiService.calculateInvoicePreview({
        'customer_name': 'John Doe',
        'classification': 'standard',
        'items_payload': [
          {
            'description': 'Product A',
            'qty': 2,
            'unit_price': 100.0,
            'amount': 200.0,
          },
          {
            'description': 'Product B',
            'qty': 1,
            'unit_price': 50.0,
            'amount': 50.0,
          }
        ],
      });

      print('Subtotal: ${result['subtotal']}');
      print('Levies: ${result['levies']}');
      print('Grand Total: ${result['grand_total']}');
    } catch (e) {
      print('Error calculating preview: $e');
    }
  }

  /// Create a new invoice
  static Future<int?> createInvoice() async {
    try {
      final result = await ApiService.createInvoice({
        'customer_name': 'John Doe',
        'customer_address': '123 Main St',
        'customer_city': 'New York, NY 10001',
        'classification': 'standard',
        'issue_date': '2026-01-27',
        'items_payload': [
          {
            'description': 'Product A',
            'qty': 2,
            'unit_price': 100.0,
            'amount': 200.0,
          }
        ],
        'notes': 'Thank you for your business!',
      });

      print('Invoice created with ID: ${result['id']}');
      print('Invoice number: ${result['invoice_number']}');
      return result['id'];
    } catch (e) {
      print('Error creating invoice: $e');
      return null;
    }
  }

  /// Get invoice details
  static Future<void> getInvoiceDetails(int invoiceId) async {
    try {
      final invoice = await ApiService.getInvoice(invoiceId);
      print('Invoice Number: ${invoice['invoice_number']}');
      print('Customer: ${invoice['customer_name']}');
      print('Grand Total: ${invoice['grand_total']}');
      print('Items: ${invoice['items']}');
    } catch (e) {
      print('Error getting invoice: $e');
    }
  }

  /// Update an existing invoice
  static Future<void> updateInvoice(int invoiceId) async {
    try {
      final result = await ApiService.updateInvoice(invoiceId, {
        'customer_name': 'Jane Smith',
        'notes': 'Updated notes',
      });
      print('Invoice updated: ${result['invoice_number']}');
    } catch (e) {
      print('Error updating invoice: $e');
    }
  }

  /// Download invoice PDF
  static Future<void> downloadInvoicePDF(int invoiceId, String filename) async {
    try {
      final response = await ApiService.downloadInvoicePDF(invoiceId);
      final file = File(filename);
      await file.writeAsBytes(response.bodyBytes);
      print('PDF saved to: $filename');
    } catch (e) {
      print('Error downloading PDF: $e');
    }
  }

  /// Get tax settings configuration
  static Future<void> getTaxSettings() async {
    try {
      final config = await ApiService.getInvoiceConfig();
      print('Tax Settings: ${config['tax_settings']}');
    } catch (e) {
      print('Error getting config: $e');
    }
  }
}

/// Example: Receipt Operations
class ReceiptExamples {
  /// Create a new receipt
  static Future<int?> createReceipt() async {
    try {
      final result = await ApiService.createReceipt({
        'received_from': 'John Doe',
        'issue_date': '2026-01-27',
        'amount': 500.00,
        'payment_method': 'cash',
        'description': 'Payment for Invoice #INV-001',
        'approved_by': 'Manager Name',
      });

      print('Receipt created with ID: ${result['id']}');
      print('Receipt number: ${result['receipt_number']}');
      return result['id'];
    } catch (e) {
      print('Error creating receipt: $e');
      return null;
    }
  }

  /// Get receipt details
  static Future<void> getReceiptDetails(int receiptId) async {
    try {
      final receipt = await ApiService.getReceipt(receiptId);
      print('Receipt Number: ${receipt['receipt_number']}');
      print('Received From: ${receipt['received_from']}');
      print('Amount: ${receipt['amount']}');
    } catch (e) {
      print('Error getting receipt: $e');
    }
  }

  /// Update a receipt
  static Future<void> updateReceipt(int receiptId) async {
    try {
      final result = await ApiService.updateReceipt(receiptId, {
        'description': 'Updated payment description',
        'approved_by': 'New Manager',
      });
      print('Receipt updated: ${result['receipt_number']}');
    } catch (e) {
      print('Error updating receipt: $e');
    }
  }

  /// Download receipt PDF
  static Future<void> downloadReceiptPDF(int receiptId, String filename) async {
    try {
      final response = await ApiService.downloadReceiptPDF(receiptId);
      final file = File(filename);
      await file.writeAsBytes(response.bodyBytes);
      print('PDF saved to: $filename');
    } catch (e) {
      print('Error downloading PDF: $e');
    }
  }
}

/// Example: Waybill Operations
class WaybillExamples {
  /// Create a new waybill
  static Future<int?> createWaybill() async {
    try {
      final result = await ApiService.createWaybill({
        'customer_name': 'ABC Company',
        'issue_date': '2026-01-27',
        'destination': 'Los Angeles, CA',
        'driver_name': 'Mike Johnson',
        'receiver_name': 'Sarah Williams',
        'items': [
          {
            'description': 'Electronics',
            'quantity': 10,
            'weight': '50kg',
          }
        ],
      });

      print('Waybill created with ID: ${result['id']}');
      print('Waybill number: ${result['waybill_number']}');
      return result['id'];
    } catch (e) {
      print('Error creating waybill: $e');
      return null;
    }
  }

  /// Get waybill details
  static Future<void> getWaybillDetails(int waybillId) async {
    try {
      final waybill = await ApiService.getWaybill(waybillId);
      print('Waybill Number: ${waybill['waybill_number']}');
      print('Destination: ${waybill['destination']}');
      print('Driver: ${waybill['driver_name']}');
    } catch (e) {
      print('Error getting waybill: $e');
    }
  }

  /// Update a waybill
  static Future<void> updateWaybill(int waybillId) async {
    try {
      final result = await ApiService.updateWaybill(waybillId, {
        'receiver_name': 'Updated Receiver',
        'destination': 'New Destination',
      });
      print('Waybill updated: ${result['waybill_number']}');
    } catch (e) {
      print('Error updating waybill: $e');
    }
  }

  /// Download waybill PDF
  static Future<void> downloadWaybillPDF(int waybillId, String filename) async {
    try {
      final response = await ApiService.downloadWaybillPDF(waybillId);
      final file = File(filename);
      await file.writeAsBytes(response.bodyBytes);
      print('PDF saved to: $filename');
    } catch (e) {
      print('Error downloading PDF: $e');
    }
  }
}

/// Example: Counter/Numbering Operations
class CounterExamples {
  /// Get next invoice number (preview mode - doesn't increment)
  static Future<void> previewNextInvoiceNumber() async {
    try {
      final nextNumber = await ApiService.getNextInvoiceNumber(increment: false);
      print('Next invoice number (preview): $nextNumber');
    } catch (e) {
      print('Error getting next invoice number: $e');
    }
  }

  /// Get and increment next invoice number
  static Future<String?> getNextInvoiceNumber() async {
    try {
      final nextNumber = await ApiService.getNextInvoiceNumber(increment: true);
      print('Next invoice number: $nextNumber');
      return nextNumber;
    } catch (e) {
      print('Error getting next invoice number: $e');
      return null;
    }
  }

  /// Get all document counts
  static Future<void> getDocumentCounts() async {
    try {
      final counts = await ApiService.getDocumentCounts();
      print('Invoice Count: ${counts['invoice_count']}');
      print('Receipt Count: ${counts['receipt_count']}');
      print('Waybill Count: ${counts['waybill_count']}');
    } catch (e) {
      print('Error getting document counts: $e');
    }
  }
}

/// Example: Project Export/Import Operations
class ProjectExamples {
  /// Export entire project
  static Future<void> exportProject(String filename) async {
    try {
      final response = await ApiService.exportProject();
      final file = File(filename);
      await file.writeAsBytes(response.bodyBytes);
      print('Project exported to: $filename');
    } catch (e) {
      print('Error exporting project: $e');
    }
  }

  /// Import project
  static Future<void> importProject(String filename) async {
    try {
      final file = File(filename);
      final bytes = await file.readAsBytes();
      final result = await ApiService.importProject(bytes);
      print('Project imported successfully: $result');
    } catch (e) {
      print('Error importing project: $e');
    }
  }
}

/// Complete workflow example
class CompleteWorkflowExample {
  static Future<void> createInvoiceWorkflow() async {
    print('=== Complete Invoice Workflow ===\n');

    // Step 1: Get next invoice number
    print('Step 1: Getting next invoice number...');
    final nextNumber = await CounterExamples.getNextInvoiceNumber();
    if (nextNumber == null) return;

    // Step 2: Calculate preview
    print('\nStep 2: Calculating invoice preview...');
    await InvoiceExamples.calculateInvoicePreview();

    // Step 3: Create invoice
    print('\nStep 3: Creating invoice...');
    final invoiceId = await InvoiceExamples.createInvoice();
    if (invoiceId == null) return;

    // Step 4: Get invoice details
    print('\nStep 4: Getting invoice details...');
    await InvoiceExamples.getInvoiceDetails(invoiceId);

    // Step 5: Download PDF
    print('\nStep 5: Downloading PDF...');
    await InvoiceExamples.downloadInvoicePDF(
      invoiceId,
      'invoice_$nextNumber.pdf',
    );

    print('\n=== Workflow Complete ===');
  }
}
