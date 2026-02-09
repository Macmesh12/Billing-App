import 'dart:io';
import 'dart:typed_data';
import 'package:pdf/widgets.dart' as pw;
import 'package:pdf/pdf.dart';
import 'package:path_provider/path_provider.dart';
import '../models/invoice.dart';
import '../models/receipt.dart';
import '../models/waybill.dart';

class PdfService {
  // ============================================================================
  // Invoice PDF
  // ============================================================================

  static Future<Uint8List> generateInvoicePdfData(Invoice invoice) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        build: (context) => [
          pw.Header(
            level: 0,
            child: pw.Text(
              'INVOICE',
              style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold),
            ),
          ),
          pw.SizedBox(height: 8),
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text('Invoice #: ${invoice.invoiceNumber}',
                      style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                  pw.Text('Date: ${invoice.date}'),
                  if (invoice.dueDate.isNotEmpty)
                    pw.Text('Due Date: ${invoice.dueDate}'),
                ],
              ),
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.end,
                children: [
                  pw.Text('Bill To:',
                      style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                  pw.Text(invoice.customerName),
                ],
              ),
            ],
          ),
          pw.SizedBox(height: 20),
          pw.TableHelper.fromTextArray(
            headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
            headerDecoration:
                const pw.BoxDecoration(color: PdfColors.grey300),
            cellPadding: const pw.EdgeInsets.all(6),
            headers: ['Description', 'Qty', 'Unit Price', 'Discount', 'Amount'],
            data: invoice.items
                .map((it) => [
                      it.description,
                      it.quantity.toString(),
                      it.unitPrice.toStringAsFixed(2),
                      it.discount.toStringAsFixed(2),
                      it.amount.toStringAsFixed(2),
                    ])
                .toList(),
          ),
          pw.SizedBox(height: 16),
          pw.Align(
            alignment: pw.Alignment.centerRight,
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.end,
              children: [
                pw.Text(
                    'Subtotal: GHS ${invoice.subtotal.toStringAsFixed(2)}'),
                pw.SizedBox(height: 4),
                pw.Text(
                    'Grand Total: GHS ${invoice.grandTotal.toStringAsFixed(2)}',
                    style: pw.TextStyle(
                        fontSize: 14, fontWeight: pw.FontWeight.bold)),
              ],
            ),
          ),
          if (invoice.issuer.isNotEmpty) ...[
            pw.SizedBox(height: 30),
            pw.Text('Issued by: ${invoice.issuer}'),
          ],
        ],
      ),
    );

    return pdf.save();
  }

  // ============================================================================
  // Receipt PDF
  // ============================================================================

  static Future<Uint8List> generateReceiptPdfData(Receipt receipt) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        build: (context) => [
          pw.Header(
            level: 0,
            child: pw.Text(
              'RECEIPT',
              style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold),
            ),
          ),
          pw.SizedBox(height: 8),
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text('Receipt #: ${receipt.receiptNumber}',
                      style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                  pw.Text('Date: ${receipt.date}'),
                ],
              ),
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.end,
                children: [
                  pw.Text('Received From:',
                      style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                  pw.Text(receipt.customerName),
                ],
              ),
            ],
          ),
          pw.SizedBox(height: 20),
          if (receipt.items.isNotEmpty)
            pw.TableHelper.fromTextArray(
              headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
              headerDecoration:
                  const pw.BoxDecoration(color: PdfColors.grey300),
              cellPadding: const pw.EdgeInsets.all(6),
              headers: ['Description', 'Qty', 'Unit Price', 'Amount'],
              data: receipt.items
                  .map((it) => [
                        it.description,
                        it.quantity.toString(),
                        it.unitPrice.toStringAsFixed(2),
                        it.amount.toStringAsFixed(2),
                      ])
                  .toList(),
            ),
          pw.SizedBox(height: 16),
          pw.Align(
            alignment: pw.Alignment.centerRight,
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.end,
              children: [
                pw.Text(
                    'Total Amount: GHS ${receipt.totalAmount.toStringAsFixed(2)}',
                    style: pw.TextStyle(
                        fontSize: 14, fontWeight: pw.FontWeight.bold)),
                if (receipt.amountReceived > 0)
                  pw.Text(
                      'Amount Received: GHS ${receipt.amountReceived.toStringAsFixed(2)}'),
                if (receipt.paymentMethod.isNotEmpty)
                  pw.Text('Payment Method: ${receipt.paymentMethod}'),
              ],
            ),
          ),
          if (receipt.issuer.isNotEmpty) ...[
            pw.SizedBox(height: 30),
            pw.Text('Approved by: ${receipt.issuer}'),
          ],
        ],
      ),
    );

    return pdf.save();
  }

  // ============================================================================
  // Waybill PDF
  // ============================================================================

  static Future<Uint8List> generateWaybillPdfData(Waybill waybill) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        build: (context) => [
          pw.Header(
            level: 0,
            child: pw.Text(
              'WAYBILL',
              style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold),
            ),
          ),
          pw.SizedBox(height: 8),
          pw.Text('Waybill #: ${waybill.waybillNumber}',
              style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
          pw.Text('Date: ${waybill.date}'),
          pw.SizedBox(height: 16),
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Expanded(
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('Shipper',
                        style:
                            pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                    if (waybill.shipperName.isNotEmpty)
                      pw.Text(waybill.shipperName),
                    if (waybill.shipperAddress.isNotEmpty)
                      pw.Text(waybill.shipperAddress),
                    if (waybill.shipperCity.isNotEmpty)
                      pw.Text(waybill.shipperCity),
                    if (waybill.shipperPhone.isNotEmpty)
                      pw.Text(waybill.shipperPhone),
                  ],
                ),
              ),
              pw.Expanded(
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('Consignee',
                        style:
                            pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                    if (waybill.consigneeName.isNotEmpty)
                      pw.Text(waybill.consigneeName),
                    if (waybill.consigneeAddress.isNotEmpty)
                      pw.Text(waybill.consigneeAddress),
                    if (waybill.consigneeCity.isNotEmpty)
                      pw.Text(waybill.consigneeCity),
                    if (waybill.consigneePhone.isNotEmpty)
                      pw.Text(waybill.consigneePhone),
                  ],
                ),
              ),
            ],
          ),
          pw.SizedBox(height: 12),
          if (waybill.originLocation.isNotEmpty ||
              waybill.destinationLocation.isNotEmpty)
            pw.Row(
              children: [
                if (waybill.originLocation.isNotEmpty)
                  pw.Text('Origin: ${waybill.originLocation}  '),
                if (waybill.destinationLocation.isNotEmpty)
                  pw.Text('Destination: ${waybill.destinationLocation}'),
              ],
            ),
          if (waybill.carrierName.isNotEmpty ||
              waybill.vehicleNumber.isNotEmpty ||
              waybill.driverName.isNotEmpty) ...[
            pw.SizedBox(height: 8),
            pw.Text('Transport',
                style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
            if (waybill.carrierName.isNotEmpty)
              pw.Text('Carrier: ${waybill.carrierName}'),
            if (waybill.vehicleNumber.isNotEmpty)
              pw.Text('Vehicle: ${waybill.vehicleNumber}'),
            if (waybill.driverName.isNotEmpty)
              pw.Text('Driver: ${waybill.driverName}'),
          ],
          pw.SizedBox(height: 16),
          if (waybill.items.isNotEmpty)
            pw.TableHelper.fromTextArray(
              headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
              headerDecoration:
                  const pw.BoxDecoration(color: PdfColors.grey300),
              cellPadding: const pw.EdgeInsets.all(6),
              headers: ['Description', 'Qty', 'Weight', 'Unit'],
              data: waybill.items
                  .map((it) => [
                        it.description,
                        it.quantity.toString(),
                        it.weight.toStringAsFixed(2),
                        it.unit,
                      ])
                  .toList(),
            ),
          if (waybill.specialInstructions.isNotEmpty) ...[
            pw.SizedBox(height: 16),
            pw.Text('Special Instructions:',
                style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
            pw.Text(waybill.specialInstructions),
          ],
        ],
      ),
    );

    return pdf.save();
  }

  // ============================================================================
  // File helpers
  // ============================================================================

  static Future<String> savePdfFile(Uint8List data, String filename,
      {String? directory}) async {
    final dir = directory != null && directory.isNotEmpty
        ? Directory(directory)
        : await getApplicationDocumentsDirectory();
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }
    final file = File('${dir.path}/$filename');
    await file.writeAsBytes(data);
    return file.path;
  }

  /// Generate invoice PDF and save to disk
  static Future<String> generateAndSave(Invoice invoice,
      {String? directory}) async {
    final data = await generateInvoicePdfData(invoice);
    final filename = invoice.invoiceNumber.isNotEmpty
        ? '${invoice.invoiceNumber}.pdf'
        : '${DateTime.now().millisecondsSinceEpoch}.pdf';
    return savePdfFile(data, filename, directory: directory);
  }

  /// Generate receipt PDF and save to disk
  static Future<String> generateAndSaveReceipt(Receipt receipt,
      {String? directory}) async {
    final data = await generateReceiptPdfData(receipt);
    final filename = receipt.receiptNumber.isNotEmpty
        ? '${receipt.receiptNumber}.pdf'
        : '${DateTime.now().millisecondsSinceEpoch}.pdf';
    return savePdfFile(data, filename, directory: directory);
  }

  /// Generate waybill PDF and save to disk
  static Future<String> generateAndSaveWaybill(Waybill waybill,
      {String? directory}) async {
    final data = await generateWaybillPdfData(waybill);
    final filename = waybill.waybillNumber.isNotEmpty
        ? '${waybill.waybillNumber}.pdf'
        : '${DateTime.now().millisecondsSinceEpoch}.pdf';
    return savePdfFile(data, filename, directory: directory);
  }
}
