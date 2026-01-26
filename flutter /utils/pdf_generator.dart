import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import '../models/invoice_data.dart';
import '../models/receipt_data.dart';
import '../models/waybill_data.dart';

class PDFGenerator {
  static Future<pw.Document> generateInvoicePDF(InvoiceData invoice) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header
              pw.Text(
                'INVOICE',
                style: pw.TextStyle(
                  fontSize: 40,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.amber700,
                ),
              ),
              pw.Divider(thickness: 2),
              pw.SizedBox(height: 20),

              // Invoice Info
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('Invoice Number', style: const pw.TextStyle(color: PdfColors.grey)),
                      pw.Text(invoice.invoiceNumber, style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text('Date', style: const pw.TextStyle(color: PdfColors.grey)),
                      pw.Text(invoice.date, style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 20),

              // Customer
              pw.Text('Bill To:', style: const pw.TextStyle(color: PdfColors.grey, fontSize: 10)),
              pw.SizedBox(height: 5),
              pw.Text(invoice.customerName, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 14)),
              pw.Text(invoice.customerAddress),
              pw.Text(invoice.customerCity),
              pw.SizedBox(height: 30),

              // Items Table
              pw.Table.fromTextArray(
                headers: ['Description', 'Qty', 'Price', 'Amount'],
                data: invoice.lineItems.map((item) => [
                      item.description,
                      item.qty.toString(),
                      '₵${item.unitPrice.toStringAsFixed(2)}',
                      '₵${item.amount.toStringAsFixed(2)}',
                    ]).toList(),
                headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                cellAlignment: pw.Alignment.centerLeft,
              ),
              pw.SizedBox(height: 20),

              // Totals
              pw.Align(
                alignment: pw.Alignment.centerRight,
                child: pw.Container(
                  width: 250,
                  child: pw.Column(
                    children: [
                      _buildPDFTotalRow('Subtotal', invoice.subtotal),
                      _buildPDFTotalRow('NHIL (2.5%)', invoice.nhil),
                      _buildPDFTotalRow('GETFUND (2.5%)', invoice.getFund),
                      _buildPDFTotalRow('VAT (15%)', invoice.vat),
                      pw.Divider(),
                      _buildPDFTotalRow('TOTAL', invoice.total, isTotal: true),
                    ],
                  ),
                ),
              ),
              pw.SizedBox(height: 30),

              // Notes
              if (invoice.notes.isNotEmpty) ...[
                pw.Text('Notes:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                pw.SizedBox(height: 5),
                pw.Text(invoice.notes, style: const pw.TextStyle(color: PdfColors.grey)),
              ],
            ],
          );
        },
      ),
    );

    return pdf;
  }

  static Future<pw.Document> generateReceiptPDF(ReceiptData receipt) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header
              pw.Center(
                child: pw.Column(
                  children: [
                    pw.Text(
                      'RECEIPT',
                      style: pw.TextStyle(
                        fontSize: 40,
                        fontWeight: pw.FontWeight.bold,
                        color: PdfColors.amber700,
                      ),
                    ),
                    pw.Text('Official Payment Receipt', style: const pw.TextStyle(color: PdfColors.grey)),
                  ],
                ),
              ),
              pw.Divider(thickness: 2),
              pw.SizedBox(height: 20),

              // Receipt Info
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('Receipt Number', style: const pw.TextStyle(color: PdfColors.grey)),
                      pw.Text(receipt.receiptNumber, style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                      pw.SizedBox(height: 10),
                      pw.Text('Date', style: const pw.TextStyle(color: PdfColors.grey)),
                      pw.Text(receipt.date, style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text('Received From:', style: const pw.TextStyle(color: PdfColors.grey)),
                      pw.Text(receipt.customerName, style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                      pw.Text(receipt.customerAddress),
                      pw.Text(receipt.customerCity),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 30),

              // Amount Box
              pw.Container(
                padding: const pw.EdgeInsets.all(20),
                decoration: pw.BoxDecoration(
                  color: PdfColors.amber50,
                  borderRadius: pw.BorderRadius.circular(10),
                ),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text('Amount Received', style: const pw.TextStyle(color: PdfColors.grey)),
                        pw.Text(
                          '₵${receipt.amountReceived.toStringAsFixed(2)}',
                          style: pw.TextStyle(
                            fontSize: 28,
                            fontWeight: pw.FontWeight.bold,
                            color: PdfColors.amber800,
                          ),
                        ),
                      ],
                    ),
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.end,
                      children: [
                        pw.Text('Payment Method', style: const pw.TextStyle(color: PdfColors.grey)),
                        pw.Text(receipt.paymentMethod, style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                      ],
                    ),
                  ],
                ),
              ),
              pw.SizedBox(height: 20),

              pw.Text('Payment For:', style: const pw.TextStyle(color: PdfColors.grey)),
              pw.Text(receipt.paymentFor, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 14)),
              pw.SizedBox(height: 10),

              pw.Text('Reference Number:', style: const pw.TextStyle(color: PdfColors.grey)),
              pw.Text(receipt.referenceNumber, style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 20),

              if (receipt.notes.isNotEmpty) ...[
                pw.Text('Notes:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                pw.SizedBox(height: 5),
                pw.Text(receipt.notes, style: const pw.TextStyle(color: PdfColors.grey)),
              ],
            ],
          );
        },
      ),
    );

    return pdf;
  }

  static Future<pw.Document> generateWaybillPDF(WaybillData waybill) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header
              pw.Center(
                child: pw.Column(
                  children: [
                    pw.Text(
                      'WAYBILL',
                      style: pw.TextStyle(
                        fontSize: 40,
                        fontWeight: pw.FontWeight.bold,
                        color: PdfColors.amber700,
                      ),
                    ),
                    pw.Text('Goods in Transit Document', style: const pw.TextStyle(color: PdfColors.grey)),
                  ],
                ),
              ),
              pw.Divider(thickness: 2),
              pw.SizedBox(height: 15),

              // Waybill Info
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('Waybill Number', style: const pw.TextStyle(color: PdfColors.grey)),
                      pw.Text(waybill.waybillNumber, style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text('Date', style: const pw.TextStyle(color: PdfColors.grey)),
                      pw.Text(waybill.date, style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 15),

              // Shipper & Consignee
              pw.Row(
                children: [
                  pw.Expanded(
                    child: pw.Container(
                      padding: const pw.EdgeInsets.all(12),
                      decoration: pw.BoxDecoration(
                        color: PdfColors.blue50,
                        borderRadius: pw.BorderRadius.circular(8),
                      ),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text('SHIPPER (From)', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.blue)),
                          pw.SizedBox(height: 5),
                          pw.Text(waybill.shipperName, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12)),
                          pw.Text('${waybill.shipperAddress}, ${waybill.shipperCity}', style: const pw.TextStyle(fontSize: 10)),
                          pw.Text('Tel: ${waybill.shipperPhone}', style: const pw.TextStyle(fontSize: 10)),
                        ],
                      ),
                    ),
                  ),
                  pw.SizedBox(width: 10),
                  pw.Expanded(
                    child: pw.Container(
                      padding: const pw.EdgeInsets.all(12),
                      decoration: pw.BoxDecoration(
                        color: PdfColors.green50,
                        borderRadius: pw.BorderRadius.circular(8),
                      ),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text('CONSIGNEE (To)', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.green)),
                          pw.SizedBox(height: 5),
                          pw.Text(waybill.consigneeName, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12)),
                          pw.Text('${waybill.consigneeAddress}, ${waybill.consigneeCity}', style: const pw.TextStyle(fontSize: 10)),
                          pw.Text('Tel: ${waybill.consigneePhone}', style: const pw.TextStyle(fontSize: 10)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              pw.SizedBox(height: 15),

              // Route
              pw.Container(
                padding: const pw.EdgeInsets.all(12),
                decoration: pw.BoxDecoration(
                  color: PdfColors.amber50,
                  borderRadius: pw.BorderRadius.circular(8),
                ),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceAround,
                  children: [
                    pw.Column(
                      children: [
                        pw.Text('Origin', style: const pw.TextStyle(color: PdfColors.grey, fontSize: 10)),
                        pw.Text(waybill.originLocation, style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                      ],
                    ),
                    pw.Text('→', style: pw.TextStyle(fontSize: 20, color: PdfColors.amber700)),
                    pw.Column(
                      children: [
                        pw.Text('Destination', style: const pw.TextStyle(color: PdfColors.grey, fontSize: 10)),
                        pw.Text(waybill.destinationLocation, style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                      ],
                    ),
                  ],
                ),
              ),
              pw.SizedBox(height: 15),

              // Carrier Info
              pw.Text('Carrier Information', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12)),
              pw.SizedBox(height: 8),
              pw.Row(
                children: [
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text('Carrier: ${waybill.carrierName}', style: const pw.TextStyle(fontSize: 10)),
                        pw.Text('Driver: ${waybill.driverName}', style: const pw.TextStyle(fontSize: 10)),
                      ],
                    ),
                  ),
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text('Vehicle: ${waybill.vehicleNumber}', style: const pw.TextStyle(fontSize: 10)),
                        pw.Text('Phone: ${waybill.driverPhone}', style: const pw.TextStyle(fontSize: 10)),
                      ],
                    ),
                  ),
                ],
              ),
              pw.SizedBox(height: 15),

              // Items
              pw.Text('Items', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12)),
              pw.SizedBox(height: 8),
              pw.Table.fromTextArray(
                headers: ['Description', 'Qty', 'Weight', 'Unit'],
                data: waybill.items.map((item) => [
                      item.description,
                      item.quantity.toString(),
                      item.weight.toStringAsFixed(2),
                      item.unit,
                    ]).toList(),
                headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10),
                cellStyle: const pw.TextStyle(fontSize: 10),
                cellAlignment: pw.Alignment.centerLeft,
              ),
              pw.SizedBox(height: 10),

              // Totals
              pw.Container(
                padding: const pw.EdgeInsets.all(8),
                decoration: pw.BoxDecoration(
                  color: PdfColors.grey200,
                  borderRadius: pw.BorderRadius.circular(4),
                ),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('TOTALS', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
                    pw.Text('Qty: ${waybill.totalQuantity}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
                    pw.Text('Weight: ${waybill.totalWeight.toStringAsFixed(2)} kg', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
                  ],
                ),
              ),
              pw.SizedBox(height: 15),

              if (waybill.specialInstructions.isNotEmpty) ...[
                pw.Text('Special Instructions:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
                pw.SizedBox(height: 5),
                pw.Container(
                  padding: const pw.EdgeInsets.all(8),
                  decoration: pw.BoxDecoration(
                    color: PdfColors.grey100,
                    borderRadius: pw.BorderRadius.circular(4),
                  ),
                  child: pw.Text(waybill.specialInstructions, style: const pw.TextStyle(fontSize: 10)),
                ),
              ],
            ],
          );
        },
      ),
    );

    return pdf;
  }

  static pw.Widget _buildPDFTotalRow(String label, double amount, {bool isTotal = false}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(
            label,
            style: pw.TextStyle(
              fontWeight: isTotal ? pw.FontWeight.bold : pw.FontWeight.normal,
              fontSize: isTotal ? 14 : 12,
            ),
          ),
          pw.Text(
            '₵${amount.toStringAsFixed(2)}',
            style: pw.TextStyle(
              fontWeight: isTotal ? pw.FontWeight.bold : pw.FontWeight.normal,
              fontSize: isTotal ? 16 : 12,
            ),
          ),
        ],
      ),
    );
  }
}
