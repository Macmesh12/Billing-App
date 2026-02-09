import 'dart:typed_data';
import 'package:shared_preferences/shared_preferences.dart';
import 'calculator.dart';
import 'settings_service.dart';
import 'pdf_service.dart';
import 'storage_service.dart';
import '../models/invoice.dart';
import '../models/receipt.dart';
import '../models/waybill.dart';

/// Fully local service — no backend HTTP calls.
/// Provides document numbering, calculation, PDF generation, and stats
/// using only local storage and the Dart calculator.
class ApiService {
  static const String _invoiceCounterKey = 'counter_invoice';
  static const String _receiptCounterKey = 'counter_receipt';
  static const String _waybillCounterKey = 'counter_waybill';

  // ============================================================================
  // Document Number Generation (sequential, persisted via SharedPreferences)
  // ============================================================================

  static Future<String> getNextInvoiceNumber({bool increment = false}) async {
    return _nextNumber('INV', _invoiceCounterKey, increment: increment);
  }

  static Future<String> getNextReceiptNumber({bool increment = false}) async {
    return _nextNumber('RCP', _receiptCounterKey, increment: increment);
  }

  static Future<String> getNextWaybillNumber({bool increment = false}) async {
    return _nextNumber('WBL', _waybillCounterKey, increment: increment);
  }

  static Future<String> _nextNumber(String prefix, String key,
      {bool increment = false}) async {
    final prefs = await SharedPreferences.getInstance();
    int current = prefs.getInt(key) ?? 0;
    int next = current + 1;
    if (increment) {
      await prefs.setInt(key, next);
    }
    final year = DateTime.now().year;
    return '$prefix-$year-${next.toString().padLeft(4, '0')}';
  }

  // ============================================================================
  // Invoice — local calculation
  // ============================================================================

  /// Calculate invoice totals locally using Dart calculator
  static Future<Map<String, dynamic>> calculateInvoiceTotalsLocal(
    List<Map<String, dynamic>> items, {
    bool useApiAsBackup = false,
  }) async {
    final taxSettings = await SettingsService.getTaxSettings();
    final totals = Calculator.calculateTotals(items, taxSettings);
    return totals.toJson();
  }

  // ============================================================================
  // Invoice Stats (computed from local files)
  // ============================================================================

  static Future<Map<String, dynamic>> getInvoiceStats() async {
    final prefs = await SharedPreferences.getInstance();
    final exportPath = prefs.getString('app_settings') != null
        ? _extractPath(prefs.getString('app_settings')!, 'pdfExportPath')
        : '';
    if (exportPath.isEmpty) {
      return {'total_estimated_revenue': '0.00'};
    }
    final invoices = await StorageService.loadRecentInvoices(exportPath);
    double total = 0;
    for (final inv in invoices) {
      total += inv.grandTotal;
    }
    return {'total_estimated_revenue': total.toStringAsFixed(2)};
  }

  static Future<Map<String, dynamic>> getReceiptStats() async {
    final prefs = await SharedPreferences.getInstance();
    final exportPath = prefs.getString('app_settings') != null
        ? _extractPath(prefs.getString('app_settings')!, 'pdfExportPath')
        : '';
    if (exportPath.isEmpty) {
      return {'total_money_received': '0.00'};
    }
    final receipts = await StorageService.loadRecentReceipts(exportPath);
    double total = 0;
    for (final r in receipts) {
      total += r.totalAmount;
    }
    return {'total_money_received': total.toStringAsFixed(2)};
  }

  // ============================================================================
  // PDF Generation (local)
  // ============================================================================

  /// Generate invoice PDF bytes locally
  static Future<Uint8List> generateInvoicePdfBytes(Invoice invoice) async {
    return PdfService.generateInvoicePdfData(invoice);
  }

  /// Generate receipt PDF bytes locally
  static Future<Uint8List> generateReceiptPdfBytes(Receipt receipt) async {
    return PdfService.generateReceiptPdfData(receipt);
  }

  /// Generate waybill PDF bytes locally
  static Future<Uint8List> generateWaybillPdfBytes(Waybill waybill) async {
    return PdfService.generateWaybillPdfData(waybill);
  }

  // ============================================================================
  // Document Counts
  // ============================================================================

  static Future<Map<String, dynamic>> getDocumentCounts() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'invoice_count': prefs.getInt(_invoiceCounterKey) ?? 0,
      'receipt_count': prefs.getInt(_receiptCounterKey) ?? 0,
      'waybill_count': prefs.getInt(_waybillCounterKey) ?? 0,
    };
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  static String _extractPath(String settingsJson, String key) {
    try {
      // Simple JSON parse to extract path value
      final decoded = settingsJson;
      final idx = decoded.indexOf('"$key"');
      if (idx == -1) return '';
      final colonIdx = decoded.indexOf(':', idx);
      if (colonIdx == -1) return '';
      final startQuote = decoded.indexOf('"', colonIdx + 1);
      if (startQuote == -1) return '';
      final endQuote = decoded.indexOf('"', startQuote + 1);
      if (endQuote == -1) return '';
      return decoded.substring(startQuote + 1, endQuote);
    } catch (_) {
      return '';
    }
  }
}
