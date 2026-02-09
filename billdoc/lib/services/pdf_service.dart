import 'dart:io';
import 'dart:typed_data';
import 'package:pdf/widgets.dart' as pw;
import 'package:path_provider/path_provider.dart';
import '../models/invoice.dart';

class PdfService {
  static Future<Uint8List> generateInvoicePdfData(Invoice invoice) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.MultiPage(
        build: (context) => [
          pw.Header(level: 0, child: pw.Text('Invoice ${invoice.invoiceNumber}')),
          pw.Text('Customer: ${invoice.customerName}'),
          pw.SizedBox(height: 8),
          pw.Text('Date: ${invoice.date}'),
          pw.SizedBox(height: 12),
          pw.Table.fromTextArray(
            headers: ['Description', 'Qty', 'Unit Price', 'Total'],
            data: invoice.items.map((it) => [it.description, it.quantity.toString(), it.unitPrice.toStringAsFixed(2), it.amount.toStringAsFixed(2)]).toList(),
          ),
          pw.SizedBox(height: 12),
          pw.Row(mainAxisAlignment: pw.MainAxisAlignment.end, children: [
            pw.Column(children: [
              pw.Text('Subtotal: ${invoice.subtotal.toStringAsFixed(2)}'),
              pw.Text('Grand Total: ${invoice.grandTotal.toStringAsFixed(2)}'),
            ])
          ])
        ],
      ),
    );

    return pdf.save();
  }

  static Future<String> savePdfFile(Uint8List data, String filename, {String? directory}) async {
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

  static Future<String> generateAndSave(Invoice invoice, {String? directory}) async {
    final data = await generateInvoicePdfData(invoice);
    final filename = '${invoice.invoiceNumber.isNotEmpty ? invoice.invoiceNumber : DateTime.now().millisecondsSinceEpoch}.pdf';
    return await savePdfFile(data, filename, directory: directory);
  }
}
