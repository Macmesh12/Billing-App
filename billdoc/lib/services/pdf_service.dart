import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/services.dart' show rootBundle;
import 'package:pdf/widgets.dart' as pw;
import 'package:pdf/pdf.dart';
import 'package:path_provider/path_provider.dart';
import '../models/invoice.dart';
import '../models/receipt.dart';
import '../models/waybill.dart';
import '../models/settings.dart';
import '../models/tax_entry.dart';

/// Brand colour used throughout all PDFs (matches the Flutter UI yellow).
const _brandColor = PdfColor.fromInt(0xFFEAB308);
const _brandColorLight = PdfColor.fromInt(0xFFFEF3C7);

/// Accent colours for waybill shipper/consignee cards.
const _blueLight = PdfColor.fromInt(0xFFDBEAFE);
const _blueDark = PdfColor.fromInt(0xFF2563EB);
const _greenLight = PdfColor.fromInt(0xFFDCFCE7);
const _greenDark = PdfColor.fromInt(0xFF16A34A);

class PdfService {
  // --------------------------------------------------------------------------
  // Shared asset helpers
  // --------------------------------------------------------------------------

  static pw.MemoryImage? _logoCached;
  static pw.MemoryImage? _signCached;

  /// Load an asset image once and cache it.
  static Future<pw.MemoryImage?> _loadAssetImage(String assetPath) async {
    try {
      final data = await rootBundle.load(assetPath);
      return pw.MemoryImage(data.buffer.asUint8List());
    } catch (_) {
      return null;
    }
  }

  static Future<pw.MemoryImage?> _getLogo() async {
    _logoCached ??= await _loadAssetImage('assets/images/logo.png');
    return _logoCached;
  }

  static Future<pw.MemoryImage?> _getSignature() async {
    _signCached ??= await _loadAssetImage('assets/images/sign.png');
    return _signCached;
  }

  // --------------------------------------------------------------------------
  // Reusable PDF building blocks
  // --------------------------------------------------------------------------

  /// Header row: logo on the left, title (+ optional subtitle) on the right.
  static pw.Widget _buildHeader(
    String title, {
    pw.MemoryImage? logo,
    String? subtitle,
  }) {
    return pw.Column(
      children: [
        pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            if (logo != null)
              pw.Image(logo, height: 60)
            else
              pw.SizedBox(width: 60, height: 60),
            pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.end,
              children: [
                pw.Text(
                  title,
                  style: pw.TextStyle(
                    fontSize: 32,
                    fontWeight: pw.FontWeight.bold,
                    color: _brandColor,
                  ),
                ),
                if (subtitle != null)
                  pw.Text(
                    subtitle,
                    style: const pw.TextStyle(
                      fontSize: 9,
                      color: PdfColors.grey600,
                    ),
                  ),
              ],
            ),
          ],
        ),
        pw.Divider(thickness: 2, color: PdfColors.grey400),
      ],
    );
  }

  /// Label / value pair used in info rows.
  static pw.Widget _labelValue(String label, String value,
      {pw.CrossAxisAlignment align = pw.CrossAxisAlignment.start}) {
    return pw.Column(
      crossAxisAlignment: align,
      children: [
        pw.Text(label,
            style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey600)),
        pw.Text(value,
            style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
      ],
    );
  }

  /// Totals row aligned to the right (label ... amount).
  static pw.Widget _totalsRow(String label, String amount,
      {bool bold = false, PdfColor? color, double fontSize = 10}) {
    final style = pw.TextStyle(
      fontSize: fontSize,
      fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal,
      color: color ?? PdfColors.black,
    );
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.end,
        children: [
          pw.SizedBox(width: 120, child: pw.Text(label, style: style)),
          pw.SizedBox(width: 16),
          pw.SizedBox(
            width: 100,
            child:
                pw.Text(amount, style: style, textAlign: pw.TextAlign.right),
          ),
        ],
      ),
    );
  }

  // ============================================================================
  // Invoice PDF
  // ============================================================================

  static Future<Uint8List> generateInvoicePdfData(
    Invoice invoice, {
    AppSettings? settings,
  }) async {
    final logo = await _getLogo();
    final sign = await _getSignature();
    final applyTax = settings?.applyTax ?? false;
    final activeTaxes = settings?.activeTaxes ?? <TaxEntry>[];
    final invoiceNote = settings?.invoiceNote ?? '';

    final pdf = pw.Document();

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        build: (context) => [
          // --- Header ---
          _buildHeader('INVOICE', logo: logo),
          pw.SizedBox(height: 12),

          // --- Invoice info row ---
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              _labelValue('Invoice Number', invoice.invoiceNumber),
              _labelValue('Date', invoice.date,
                  align: pw.CrossAxisAlignment.end),
            ],
          ),
          if (invoice.dueDate.isNotEmpty) ...[
            pw.SizedBox(height: 4),
            pw.Align(
              alignment: pw.Alignment.centerLeft,
              child: _labelValue('Due Date', invoice.dueDate),
            ),
          ],
          pw.SizedBox(height: 16),

          // --- Bill To ---
          pw.Text('Bill To:',
              style:
                  const pw.TextStyle(fontSize: 8, color: PdfColors.grey600)),
          pw.SizedBox(height: 4),
          pw.Text(invoice.customerName,
              style:
                  pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 20),

          // --- Items table ---
          pw.TableHelper.fromTextArray(
            border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
            headerStyle: pw.TextStyle(
                fontWeight: pw.FontWeight.bold,
                fontSize: 9,
                color: PdfColors.black),
            headerDecoration:
                const pw.BoxDecoration(color: PdfColors.grey200),
            cellStyle: const pw.TextStyle(fontSize: 9),
            cellPadding:
                const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            cellAlignments: {
              0: pw.Alignment.centerLeft,
              1: pw.Alignment.centerRight,
              2: pw.Alignment.centerRight,
              3: pw.Alignment.centerRight,
              4: pw.Alignment.centerRight,
            },
            headers: ['Description', 'Qty', 'Price', 'Discount', 'Amount'],
            data: invoice.items
                .map((it) => [
                      it.description,
                      '${it.quantity}',
                      'GHS ${it.unitPrice.toStringAsFixed(2)}',
                      'GHS ${it.discount.toStringAsFixed(2)}',
                      'GHS ${it.amount.toStringAsFixed(2)}',
                    ])
                .toList(),
          ),
          pw.SizedBox(height: 16),

          // --- Totals ---
          _totalsRow(
              'Subtotal', 'GHS ${invoice.subtotal.toStringAsFixed(2)}'),
          if (invoice.customerPreviousBalance > 0)
            _totalsRow(
              'Previous Balance',
              'GHS ${invoice.customerPreviousBalance.toStringAsFixed(2)}',
              color: PdfColor.fromInt(0xFFEA580C),
            ),
          if (applyTax) ...[
            ...activeTaxes.map((tax) => _totalsRow(
              '${tax.name} (${tax.rate}%)',
              'GHS ${invoice.calculateTax(tax).toStringAsFixed(2)}',
            )),
          ],
          pw.Divider(color: PdfColors.grey400),
          _totalsRow(
            'GRAND TOTAL',
            'GHS ${(invoice.calculateGrandTotalFromTaxes(
                  applyTax: applyTax,
                  taxes: activeTaxes,
                ) + invoice.customerPreviousBalance).toStringAsFixed(2)}',
            bold: true,
            fontSize: 13,
          ),
          pw.SizedBox(height: 20),

          // --- Notes ---
          if (invoiceNote.isNotEmpty) ...[
            pw.Text('Notes:',
                style: pw.TextStyle(
                    fontSize: 9, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 4),
            pw.Text(invoiceNote,
                style: const pw.TextStyle(
                    fontSize: 8, color: PdfColors.grey700)),
            pw.SizedBox(height: 16),
          ],

          // --- Payment terms box ---
          pw.Container(
            padding: const pw.EdgeInsets.all(10),
            decoration: pw.BoxDecoration(
              color: _brandColorLight,
              border: pw.Border.all(color: _brandColor, width: 0.5),
              borderRadius: pw.BorderRadius.circular(4),
            ),
            child: pw.Text(
              '100% payment before job is done. Money paid is not refundable.',
              style:
                  pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold),
            ),
          ),
          pw.SizedBox(height: 24),

          // --- Signature ---
          pw.Divider(color: PdfColors.grey300),
          pw.SizedBox(height: 6),
          if (sign != null) pw.Image(sign, height: 50),
          pw.SizedBox(height: 4),
          pw.Text('Management Signature',
              style:
                  const pw.TextStyle(fontSize: 7, color: PdfColors.grey500)),
          if (invoice.issuer.isNotEmpty) ...[
            pw.SizedBox(height: 8),
            pw.Text('Issued by: ${invoice.issuer}',
                style: const pw.TextStyle(fontSize: 9)),
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
    final logo = await _getLogo();
    final pdf = pw.Document();

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        build: (context) => [
          // --- Header ---
          _buildHeader('RECEIPT',
              logo: logo, subtitle: 'Official Payment Receipt'),
          pw.SizedBox(height: 12),

          // --- Receipt info ---
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  _labelValue('Receipt Number', receipt.receiptNumber),
                  pw.SizedBox(height: 8),
                  _labelValue('Date', receipt.date),
                ],
              ),
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.end,
                children: [
                  _labelValue('Received From', receipt.customerName,
                      align: pw.CrossAxisAlignment.end),
                ],
              ),
            ],
          ),
          pw.SizedBox(height: 20),

          // --- Items table ---
          if (receipt.items.isNotEmpty) ...[
            pw.TableHelper.fromTextArray(
              border:
                  pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
              headerStyle: pw.TextStyle(
                  fontWeight: pw.FontWeight.bold,
                  fontSize: 9,
                  color: PdfColors.black),
              headerDecoration:
                  const pw.BoxDecoration(color: PdfColors.grey200),
              cellStyle: const pw.TextStyle(fontSize: 9),
              cellPadding:
                  const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              cellAlignments: {
                0: pw.Alignment.centerLeft,
                1: pw.Alignment.center,
                2: pw.Alignment.centerRight,
                3: pw.Alignment.centerRight,
              },
              headers: ['Description', 'Qty', 'Unit Price', 'Amount'],
              data: receipt.items
                  .map((it) => [
                        it.description,
                        '${it.quantity}',
                        'GHS ${it.unitPrice.toStringAsFixed(2)}',
                        'GHS ${it.amount.toStringAsFixed(2)}',
                      ])
                  .toList(),
            ),
            pw.SizedBox(height: 4),
            // Total row inside a shaded bar
            pw.Container(
              padding:
                  const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              decoration: const pw.BoxDecoration(
                color: PdfColors.grey100,
                border: pw.Border(
                  top: pw.BorderSide(color: PdfColors.grey400, width: 1.5),
                ),
              ),
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('TOTAL',
                      style: pw.TextStyle(
                          fontWeight: pw.FontWeight.bold, fontSize: 11)),
                  pw.Text('GHS ${receipt.totalAmount.toStringAsFixed(2)}',
                      style: pw.TextStyle(
                          fontWeight: pw.FontWeight.bold,
                          fontSize: 13,
                          color: _brandColor)),
                ],
              ),
            ),
            pw.SizedBox(height: 20),
          ],

          // --- Amount Received highlight box ---
          pw.Container(
            padding: const pw.EdgeInsets.all(16),
            decoration: pw.BoxDecoration(
              color: _brandColorLight,
              borderRadius: pw.BorderRadius.circular(6),
            ),
            child: pw.Column(
              children: [
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text('Amount Received',
                            style: const pw.TextStyle(
                                fontSize: 8, color: PdfColors.grey600)),
                        pw.Text(
                          'GHS ${receipt.amountReceived.toStringAsFixed(2)}',
                          style: pw.TextStyle(
                            fontSize: 22,
                            fontWeight: pw.FontWeight.bold,
                            color: PdfColor.fromInt(0xFFCA8A04),
                          ),
                        ),
                      ],
                    ),
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.end,
                      children: [
                        pw.Text('Payment Method',
                            style: const pw.TextStyle(
                                fontSize: 8, color: PdfColors.grey600)),
                        pw.Text(receipt.paymentMethod,
                            style: pw.TextStyle(
                                fontSize: 10,
                                fontWeight: pw.FontWeight.bold)),
                      ],
                    ),
                  ],
                ),
                if (receipt.balance != 0) ...[
                  pw.SizedBox(height: 10),
                  pw.Divider(color: PdfColors.grey400),
                  pw.SizedBox(height: 6),
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text('Balance',
                          style: pw.TextStyle(
                              fontWeight: pw.FontWeight.bold, fontSize: 10)),
                      pw.Text(
                        'GHS ${receipt.balance.toStringAsFixed(2)}',
                        style: pw.TextStyle(
                          fontWeight: pw.FontWeight.bold,
                          fontSize: 11,
                          color: receipt.balance > 0
                              ? PdfColors.red
                              : PdfColors.green,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          pw.SizedBox(height: 20),

          // --- Issued By ---
          if (receipt.issuer.isNotEmpty) ...[
            pw.Row(children: [
              pw.Text('Issued By: ',
                  style: const pw.TextStyle(
                      fontSize: 9, color: PdfColors.grey600)),
              pw.Text(receipt.issuer,
                  style: pw.TextStyle(
                      fontSize: 9, fontWeight: pw.FontWeight.bold)),
            ]),
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
    final logo = await _getLogo();
    final pdf = pw.Document();

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        build: (context) => [
          // --- Header ---
          _buildHeader('WAYBILL',
              logo: logo, subtitle: 'Goods in Transit Document'),
          pw.SizedBox(height: 12),

          // --- Waybill info ---
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              _labelValue('Waybill Number', waybill.waybillNumber),
              _labelValue('Date', waybill.date,
                  align: pw.CrossAxisAlignment.end),
            ],
          ),
          if (waybill.issuer.isNotEmpty) ...[
            pw.SizedBox(height: 6),
            pw.Row(children: [
              pw.Text('Issued By: ',
                  style: const pw.TextStyle(
                      fontSize: 8, color: PdfColors.grey600)),
              pw.Text(waybill.issuer,
                  style: pw.TextStyle(
                      fontSize: 9, fontWeight: pw.FontWeight.bold)),
            ]),
          ],
          pw.SizedBox(height: 16),

          // --- Shipper & Consignee cards side by side ---
          pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Expanded(
                child: pw.Container(
                  padding: const pw.EdgeInsets.all(12),
                  decoration: pw.BoxDecoration(
                    color: _blueLight,
                    borderRadius: pw.BorderRadius.circular(6),
                  ),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('SHIPPER (From)',
                          style: pw.TextStyle(
                              fontWeight: pw.FontWeight.bold,
                              fontSize: 9,
                              color: _blueDark)),
                      pw.SizedBox(height: 6),
                      pw.Text(waybill.shipperName,
                          style: pw.TextStyle(
                              fontWeight: pw.FontWeight.bold, fontSize: 10)),
                      if (waybill.shipperAddress.isNotEmpty ||
                          waybill.shipperCity.isNotEmpty)
                        pw.Text(
                          '${waybill.shipperAddress}${waybill.shipperCity.isNotEmpty ? ", ${waybill.shipperCity}" : ""}',
                          style: const pw.TextStyle(fontSize: 8),
                        ),
                      if (waybill.shipperPhone.isNotEmpty)
                        pw.Text('Tel: ${waybill.shipperPhone}',
                            style: const pw.TextStyle(fontSize: 8)),
                    ],
                  ),
                ),
              ),
              pw.SizedBox(width: 12),
              pw.Expanded(
                child: pw.Container(
                  padding: const pw.EdgeInsets.all(12),
                  decoration: pw.BoxDecoration(
                    color: _greenLight,
                    borderRadius: pw.BorderRadius.circular(6),
                  ),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('CONSIGNEE (To)',
                          style: pw.TextStyle(
                              fontWeight: pw.FontWeight.bold,
                              fontSize: 9,
                              color: _greenDark)),
                      pw.SizedBox(height: 6),
                      pw.Text(waybill.consigneeName,
                          style: pw.TextStyle(
                              fontWeight: pw.FontWeight.bold, fontSize: 10)),
                      if (waybill.consigneeAddress.isNotEmpty ||
                          waybill.consigneeCity.isNotEmpty)
                        pw.Text(
                          '${waybill.consigneeAddress}${waybill.consigneeCity.isNotEmpty ? ", ${waybill.consigneeCity}" : ""}',
                          style: const pw.TextStyle(fontSize: 8),
                        ),
                      if (waybill.consigneePhone.isNotEmpty)
                        pw.Text('Tel: ${waybill.consigneePhone}',
                            style: const pw.TextStyle(fontSize: 8)),
                    ],
                  ),
                ),
              ),
            ],
          ),
          pw.SizedBox(height: 16),

          // --- Origin → Destination route bar ---
          if (waybill.originLocation.isNotEmpty ||
              waybill.destinationLocation.isNotEmpty)
            pw.Container(
              padding: const pw.EdgeInsets.symmetric(
                  horizontal: 16, vertical: 10),
              decoration: pw.BoxDecoration(
                color: _brandColorLight,
                borderRadius: pw.BorderRadius.circular(6),
              ),
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceAround,
                children: [
                  pw.Column(children: [
                    pw.Text('Origin',
                        style: const pw.TextStyle(
                            fontSize: 8, color: PdfColors.grey600)),
                    pw.Text(waybill.originLocation,
                        style: pw.TextStyle(
                            fontWeight: pw.FontWeight.bold, fontSize: 11)),
                  ]),
                  pw.Text('>>>',
                      style: pw.TextStyle(
                          fontWeight: pw.FontWeight.bold,
                          fontSize: 14,
                          color: _brandColor)),
                  pw.Column(children: [
                    pw.Text('Destination',
                        style: const pw.TextStyle(
                            fontSize: 8, color: PdfColors.grey600)),
                    pw.Text(waybill.destinationLocation,
                        style: pw.TextStyle(
                            fontWeight: pw.FontWeight.bold, fontSize: 11)),
                  ]),
                ],
              ),
            ),
          pw.SizedBox(height: 16),

          // --- Carrier Information ---
          if (waybill.carrierName.isNotEmpty ||
              waybill.vehicleNumber.isNotEmpty ||
              waybill.driverName.isNotEmpty) ...[
            pw.Text('Carrier Information',
                style: pw.TextStyle(
                    fontSize: 12, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 8),
            pw.Row(children: [
              pw.Expanded(
                  child: _labelValue('Carrier', waybill.carrierName)),
              pw.Expanded(
                  child: _labelValue('Vehicle', waybill.vehicleNumber)),
            ]),
            pw.SizedBox(height: 6),
            pw.Row(children: [
              pw.Expanded(
                  child: _labelValue('Driver', waybill.driverName)),
              pw.Expanded(
                  child: _labelValue('Phone', waybill.driverPhone)),
            ]),
            pw.SizedBox(height: 16),
          ],

          // --- Items table ---
          if (waybill.items.isNotEmpty) ...[
            pw.Text('Items',
                style: pw.TextStyle(
                    fontSize: 12, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 8),
            pw.TableHelper.fromTextArray(
              border:
                  pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
              headerStyle: pw.TextStyle(
                  fontWeight: pw.FontWeight.bold,
                  fontSize: 9,
                  color: PdfColors.black),
              headerDecoration:
                  const pw.BoxDecoration(color: PdfColors.grey200),
              cellStyle: const pw.TextStyle(fontSize: 9),
              cellPadding:
                  const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              cellAlignments: {
                0: pw.Alignment.centerLeft,
                1: pw.Alignment.centerRight,
                2: pw.Alignment.centerRight,
                3: pw.Alignment.centerLeft,
              },
              headers: ['Description', 'Qty', 'Weight', 'Unit'],
              data: waybill.items
                  .map((it) => [
                        it.description,
                        '${it.quantity}',
                        it.weight.toStringAsFixed(2),
                        it.unit,
                      ])
                  .toList(),
            ),
            pw.SizedBox(height: 8),
            // Totals bar
            pw.Container(
              padding:
                  const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              decoration: const pw.BoxDecoration(color: PdfColors.grey100),
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('TOTALS',
                      style: pw.TextStyle(
                          fontWeight: pw.FontWeight.bold, fontSize: 10)),
                  pw.Text('Qty: ${waybill.totalQuantity}',
                      style: pw.TextStyle(
                          fontWeight: pw.FontWeight.bold, fontSize: 10)),
                  pw.Text(
                      'Weight: ${waybill.totalWeight.toStringAsFixed(2)} kg',
                      style: pw.TextStyle(
                          fontWeight: pw.FontWeight.bold, fontSize: 10)),
                ],
              ),
            ),
          ],

          // --- Special Instructions ---
          if (waybill.specialInstructions.isNotEmpty) ...[
            pw.SizedBox(height: 16),
            pw.Text('Special Instructions:',
                style: pw.TextStyle(
                    fontSize: 10, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 6),
            pw.Container(
              padding: const pw.EdgeInsets.all(10),
              decoration: pw.BoxDecoration(
                color: PdfColors.grey100,
                borderRadius: pw.BorderRadius.circular(4),
              ),
              child: pw.Text(waybill.specialInstructions,
                  style: const pw.TextStyle(fontSize: 9)),
            ),
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
      {String? directory, AppSettings? settings}) async {
    final data =
        await generateInvoicePdfData(invoice, settings: settings);
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
