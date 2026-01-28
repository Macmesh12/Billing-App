import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

/// Utility class for generating PDF documents
class PDFGenerator {
  /// Generate a PDF for an invoice
  static Future<pw.Document> generateInvoicePDF(dynamic invoice) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return pw.Center(
            child: pw.Column(
              mainAxisAlignment: pw.MainAxisAlignment.center,
              children: [
                pw.Text(
                  'INVOICE',
                  style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold),
                ),
                pw.SizedBox(height: 20),
                pw.Text('Invoice Number: ${invoice['number'] ?? 'N/A'}'),
                pw.Text('Customer: ${invoice['customer'] ?? 'N/A'}'),
                pw.Text('Amount: ${invoice['amount'] ?? 'N/A'}'),
              ],
            ),
          );
        },
      ),
    );

    return pdf;
  }

  /// Generate a PDF for a receipt
  static Future<pw.Document> generateReceiptPDF(dynamic receipt) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return pw.Center(
            child: pw.Column(
              mainAxisAlignment: pw.MainAxisAlignment.center,
              children: [
                pw.Text(
                  'RECEIPT',
                  style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold),
                ),
                pw.SizedBox(height: 20),
                pw.Text('Receipt Number: ${receipt['number'] ?? 'N/A'}'),
                pw.Text('Customer: ${receipt['customer'] ?? 'N/A'}'),
                pw.Text('Amount: ${receipt['amount'] ?? 'N/A'}'),
              ],
            ),
          );
        },
      ),
    );

    return pdf;
  }

  /// Generate a PDF for a waybill
  static Future<pw.Document> generateWaybillPDF(dynamic waybill) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return pw.Center(
            child: pw.Column(
              mainAxisAlignment: pw.MainAxisAlignment.center,
              children: [
                pw.Text(
                  'WAYBILL',
                  style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold),
                ),
                pw.SizedBox(height: 20),
                pw.Text('Waybill Number: ${waybill['number'] ?? 'N/A'}'),
                pw.Text('Customer: ${waybill['customer'] ?? 'N/A'}'),
                pw.Text('Destination: ${waybill['destination'] ?? 'N/A'}'),
              ],
            ),
          );
        },
      ),
    );

    return pdf;
  }
}
