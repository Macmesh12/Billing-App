import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../models/invoice.dart';
import '../widgets/custom_button.dart';
import '../services/api_service.dart';
import '../services/pdf_service.dart';
import 'package:path/path.dart' as path;

class InvoiceScreen extends StatefulWidget {
  const InvoiceScreen({super.key});

  @override
  State<InvoiceScreen> createState() => _InvoiceScreenState();
}

class _InvoiceScreenState extends State<InvoiceScreen> {
  bool isEditMode = true;

  @override
  void initState() {
    super.initState();
    _loadNextInvoiceNumber();
  }

  Future<void> _loadNextInvoiceNumber() async {
    try {
      final appState = Provider.of<AppState>(context, listen: false);
      final invoice = appState.invoiceData;
      
      // Only fetch new number if current invoice number is empty or a placeholder
      if (invoice.invoiceNumber.isEmpty || invoice.invoiceNumber.startsWith('INV-')) {
        final nextNumber = await ApiService.getNextInvoiceNumber(increment: false);
        appState.updateInvoiceData(invoice.copyWith(invoiceNumber: nextNumber));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load invoice number: $e'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final invoice = appState.invoiceData;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEditMode ? 'Create Invoice' : 'Invoice Preview'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => appState.setActiveView('home'),
        ),
        actions: [
          if (isEditMode)
            TextButton.icon(
              icon: const Icon(Icons.visibility),
              label: const Text('Preview'),
              onPressed: () => setState(() => isEditMode = false),
            )
          else
            TextButton.icon(
              icon: const Icon(Icons.edit),
              label: const Text('Edit'),
              onPressed: () => setState(() => isEditMode = true),
            ),
          if (!isEditMode)
            TextButton.icon(
              icon: const Icon(Icons.print),
              label: const Text('Export PDF'),
              onPressed: () => _exportPDF(context, invoice),
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 800),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 20,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            padding: const EdgeInsets.all(48),
            child: isEditMode
                ? _buildEditView(context, appState)
                : _buildPreviewView(context, invoice),
          ),
        ),
      ),
    );
  }

  Widget _buildEditView(BuildContext context, AppState appState) {
    final invoice = appState.invoiceData;
    final settings = appState.settings;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        const Text(
          'INVOICE',
          style: TextStyle(
            fontSize: 40,
            fontWeight: FontWeight.bold,
            color: Color(0xFFEAB308),
          ),
        ),
        const SizedBox(height: 32),

        // Invoice Details
        Row(
          children: [
            Expanded(
              child: _buildTextField(
                label: 'Invoice Number',
                value: invoice.invoiceNumber,
                onChanged: (v) => appState.updateInvoiceData(
                  invoice.copyWith(invoiceNumber: v),
                ),
                readOnly: true,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Date',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF374151),
                    ),
                  ),
                  const SizedBox(height: 6),
                  InkWell(
                    onTap: () async {
                      final DateTime? picked = await showDatePicker(
                        context: context,
                        initialDate: DateTime.now(),
                        firstDate: DateTime(2000),
                        lastDate: DateTime(2100),
                      );
                      if (picked != null) {
                        final formattedDate = '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
                        appState.updateInvoiceData(
                          invoice.copyWith(date: formattedDate),
                        );
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 16,
                      ),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.shade400),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            invoice.date.isEmpty
                                ? 'Select Date'
                                : invoice.date,
                            style: TextStyle(
                              color: invoice.date.isEmpty
                                  ? Colors.grey
                                  : Colors.black,
                            ),
                          ),
                          const Icon(Icons.calendar_today, size: 20),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        _buildTextField(
          label: 'Issuer',
          value: invoice.issuer,
          onChanged: (v) =>
              appState.updateInvoiceData(invoice.copyWith(issuer: v)),
        ),
        const SizedBox(height: 24),

        // Customer Details
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Customer Details',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            if (settings.enableCustomerManagement &&
                settings.customers.isNotEmpty)
              _buildCustomerDropdown(appState, invoice),
          ],
        ),
        const SizedBox(height: 16),

        _buildTextField(
          label: 'Customer Name',
          value: invoice.customerName,
          onChanged: (v) =>
              appState.updateInvoiceData(invoice.copyWith(customerName: v)),
        ),
        const SizedBox(height: 16),
        const SizedBox(height: 16),
        const SizedBox(height: 24),

        // Line Items
        const Text(
          'Line Items',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),

        ...List.generate(invoice.items.length, (index) {
          final item = invoice.items[index];
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          flex: 3,
                          child: _buildTextField(
                            label: 'Description',
                            value: item.description,
                            onChanged: (v) {
                              final newItems = List<InvoiceItem>.from(
                                invoice.items,
                              );
                              newItems[index] = item.copyWith(description: v);
                              appState.updateInvoiceData(
                                invoice.copyWith(items: newItems),
                              );
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildTextField(
                            label: 'Qty',
                            value: item.quantity.toString(),
                            keyboardType: TextInputType.number,
                            onChanged: (v) {
                              final newItems = List<InvoiceItem>.from(
                                invoice.items,
                              );
                              newItems[index] = item.copyWith(
                                quantity: int.tryParse(v) ?? 1,
                              );
                              appState.updateInvoiceData(
                                invoice.copyWith(items: newItems),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _buildTextField(
                            label: 'Unit Price',
                            value: item.unitPrice.toString(),
                            keyboardType: TextInputType.number,
                            onChanged: (v) {
                              final newItems = List<InvoiceItem>.from(
                                invoice.items,
                              );
                              newItems[index] = item.copyWith(
                                unitPrice: double.tryParse(v) ?? 0,
                              );
                              appState.updateInvoiceData(
                                invoice.copyWith(items: newItems),
                              );
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildTextField(
                            label: 'Discount',
                            value: item.discount.toString(),
                            keyboardType: TextInputType.number,
                            onChanged: (v) {
                              final newItems = List<InvoiceItem>.from(
                                invoice.items,
                              );
                              newItems[index] = item.copyWith(
                                discount: double.tryParse(v) ?? 0,
                              );
                              appState.updateInvoiceData(
                                invoice.copyWith(items: newItems),
                              );
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Amount',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  border: Border.all(color: Colors.grey),
                                  borderRadius: BorderRadius.circular(8),
                                  color: Colors.grey.shade50,
                                ),
                                child: Text(
                                  'GHS ${item.amount.toStringAsFixed(2)}',
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete, color: Colors.red),
                          onPressed: () {
                            if (invoice.items.length > 1) {
                              final newItems = List<InvoiceItem>.from(
                                invoice.items,
                              );
                              newItems.removeAt(index);
                              appState.updateInvoiceData(
                                invoice.copyWith(items: newItems),
                              );
                            }
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        }),

        OutlinedButton.icon(
          icon: const Icon(Icons.add),
          label: const Text('Add Line Item'),
          onPressed: () {
            final newItems = List<InvoiceItem>.from(invoice.items)
              ..add(InvoiceItem());
            appState.updateInvoiceData(invoice.copyWith(items: newItems));
          },
        ),
        const SizedBox(height: 24),

        // Tax Toggle
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.amber.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.amber.shade200),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Apply Taxes (NHIL, GETFund, VAT)',
                style: TextStyle(fontWeight: FontWeight.w500),
              ),
              Switch(
                value: settings.applyTax,
                activeThumbColor: const Color(0xFFEAB308),
                activeTrackColor: const Color(0xFFEAB308).withAlpha(128),
                onChanged: (value) {
                  appState.updateSettings(settings.copyWith(applyTax: value));
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Totals Summary
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: Column(
            children: [
              _buildTotalRow('Subtotal', invoice.subtotal, 'GHS'),
              if (invoice.customerPreviousBalance > 0) ...[
                const Divider(height: 16),
                _buildTotalRow(
                  'Previous Balance',
                  invoice.customerPreviousBalance,
                  'GHS',
                  color: Colors.orange,
                ),
              ],
              if (settings.applyTax) ...[
                _buildTotalRow(
                  'NHIL (${settings.nhilRate}%)',
                  invoice.calculateNhil(settings.nhilRate),
                  'GHS',
                ),
                _buildTotalRow(
                  'GETFund (${settings.getfundRate}%)',
                  invoice.calculateGetfund(settings.getfundRate),
                  'GHS',
                ),
                _buildTotalRow(
                  'VAT (${settings.vatRate}%)',
                  invoice.calculateVat(settings.vatRate),
                  'GHS',
                ),
              ],
              const Divider(),
              _buildTotalRow(
                'GRAND TOTAL',
                invoice.calculateGrandTotal(
                  applyTax: settings.applyTax,
                  nhilRate: settings.nhilRate,
                  getfundRate: settings.getfundRate,
                  vatRate: settings.vatRate,
                ) + invoice.customerPreviousBalance,
                'GHS',
                isTotal: true,
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        const SizedBox(height: 32),

        // Action Buttons
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            OutlinedButton.icon(
              icon: const Icon(Icons.save_outlined),
              label: const Text('Save as Draft'),
              onPressed: () {
                appState.saveInvoiceAsDraft(invoice);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Invoice saved as draft')),
                );
              },
            ),
            const SizedBox(width: 16),
            CustomButton(
              text: 'Preview Invoice',
              icon: Icons.visibility,
              onPressed: () => setState(() => isEditMode = false),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPreviewView(BuildContext context, invoice) {
    final settings = Provider.of<AppState>(context).settings;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header with logo
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Always show logo.png from assets
                Image.asset(
                  'assets/images/logo.png',
                  height: 80,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) {
                    // Fallback if logo not found
                    return const Icon(
                      Icons.business,
                      size: 60,
                      color: Color(0xFFEAB308),
                    );
                  },
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                const Text(
                  'INVOICE',
                  style: TextStyle(
                    fontSize: 40,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFEAB308),
                  ),
                ),
              ],
            ),
          ],
        ),
        const Divider(height: 32, thickness: 2),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Invoice Number',
                  style: TextStyle(color: Colors.grey),
                ),
                Text(
                  invoice.invoiceNumber,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                const Text('Date', style: TextStyle(color: Colors.grey)),
                Text(
                  invoice.date,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ],
        ),

        const SizedBox(height: 24),
        const Text(
          'Bill To:',
          style: TextStyle(color: Colors.grey, fontSize: 12),
        ),
        const SizedBox(height: 8),
        Text(
          invoice.customerName,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        const SizedBox(height: 32),
        const SizedBox(height: 32),
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey.shade300),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(8),
                  ),
                ),
                child: const Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: Text(
                        'Description',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                    Expanded(
                      child: Text(
                        'Qty',
                        textAlign: TextAlign.right,
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                    Expanded(
                      child: Text(
                        'Price',
                        textAlign: TextAlign.right,
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                    Expanded(
                      child: Text(
                        'Discount',
                        textAlign: TextAlign.right,
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                    Expanded(
                      child: Text(
                        'Amount',
                        textAlign: TextAlign.right,
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
              ...invoice.items.map(
                (item) => Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    border: Border(
                      top: BorderSide(color: Colors.grey.shade200),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(flex: 3, child: Text(item.description)),
                      Expanded(
                        child: Text(
                          '${item.quantity}',
                          textAlign: TextAlign.right,
                        ),
                      ),
                      Expanded(
                        child: Text(
                          'GHS ${item.unitPrice.toStringAsFixed(2)}',
                          textAlign: TextAlign.right,
                        ),
                      ),
                      Expanded(
                        child: Text(
                          'GHS ${item.discount.toStringAsFixed(2)}',
                          textAlign: TextAlign.right,
                        ),
                      ),
                      Expanded(
                        child: Text(
                          'GHS ${item.amount.toStringAsFixed(2)}',
                          textAlign: TextAlign.right,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Column(
          children: [
            _buildTotalRow('Subtotal', invoice.subtotal, 'GHS'),
            if (invoice.customerPreviousBalance > 0) ...[
              const Divider(height: 16),
              _buildTotalRow(
                'Previous Balance',
                invoice.customerPreviousBalance,
                'GHS',
                color: Colors.orange,
              ),
            ],
            if (settings.applyTax) ...[
              _buildTotalRow(
                'NHIL (${settings.nhilRate}%)',
                invoice.calculateNhil(settings.nhilRate),
                'GHS',
              ),
              _buildTotalRow(
                'GETFund (${settings.getfundRate}%)',
                invoice.calculateGetfund(settings.getfundRate),
                'GHS',
              ),
              _buildTotalRow(
                'VAT (${settings.vatRate}%)',
                invoice.calculateVat(settings.vatRate),
                'GHS',
              ),
            ],
            const Divider(),
            _buildTotalRow(
              'GRAND TOTAL',
              invoice.calculateGrandTotal(
                applyTax: settings.applyTax,
                nhilRate: settings.nhilRate,
                getfundRate: settings.getfundRate,
                vatRate: settings.vatRate,
              ) + invoice.customerPreviousBalance,
              'GHS',
              isTotal: true,
            ),
          ],
        ),
        const SizedBox(height: 24),
        if (settings.invoiceNote.isNotEmpty) ...[
          const Text('Notes:', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(settings.invoiceNote, style: const TextStyle(color: Colors.grey)),
        ],
        const SizedBox(height: 32),        // Payment Terms
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.yellow.shade50,
            border: Border.all(color: Colors.yellow.shade700),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Text(
            '100% payment before job is done. Money paid is not refundable.',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 12,
              color: Colors.black87,
            ),
          ),
        ),
        const SizedBox(height: 32),
        // Management Signature (fixed asset)
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Divider(),
                  const SizedBox(height: 8),
                  Image.asset(
                    'assets/images/sign.png',
                    height: 80,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) {
                      return const SizedBox.shrink();
                    },
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Management Signature',
                    style: TextStyle(
                      fontSize: 10,
                      color: Colors.grey,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildTotalRow(
    String label,
    double amount,
    String currency, {
    bool isTotal = false,
    Color? color,
  }) {
    final textColor = color ?? (isTotal ? Colors.black : Colors.black87);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(
                fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
                fontSize: isTotal ? 16 : 14,
                color: textColor,
              ),
            ),
          ),
          const SizedBox(width: 24),
          SizedBox(
            width: 120,
            child: Text(
              '$currency ${amount.toStringAsFixed(2)}',
              textAlign: TextAlign.right,
              style: TextStyle(
                fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
                fontSize: isTotal ? 18 : 14,
                color: textColor,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required String label,
    required String value,
    required Function(String) onChanged,
    int maxLines = 1,
    TextInputType? keyboardType,
    bool readOnly = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: Color(0xFF374151),
          ),
        ),
        const SizedBox(height: 6),
        TextFormField(
          initialValue: value,
          maxLines: maxLines,
          keyboardType: keyboardType,
          onChanged: readOnly ? null : onChanged,
          readOnly: readOnly,
          style: TextStyle(
            color: readOnly ? Colors.grey.shade700 : Colors.black,
            fontWeight: readOnly ? FontWeight.w600 : FontWeight.normal,
          ),
          decoration: InputDecoration(
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 12,
            ),
            filled: readOnly,
            fillColor: readOnly ? Colors.grey.shade100 : null,
          ),
        ),
      ],
    );
  }

  Future<void> _exportPDF(BuildContext context, invoice) async {
    final appState = Provider.of<AppState>(context, listen: false);
    final pdfExportPath = appState.settings.pdfExportPath;

    if (pdfExportPath.isEmpty) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please set PDF export path in Settings'),
            backgroundColor: Colors.orange,
          ),
        );
      }
      return;
    }

    // Show loading dialog
    if (context.mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: Card(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(width: 24),
                  Text('Generating PDF...'),
                ],
              ),
            ),
          ),
        ),
      );
    }

    try {
      // Generate PDF locally
      final pdfBytes = await PdfService.generateInvoicePdfData(invoice);

      // Create invoices subfolder in pdfExportPath
      final invoicesDir = Directory(path.join(pdfExportPath, 'invoices'));
      if (!await invoicesDir.exists()) {
        await invoicesDir.create(recursive: true);
      }

      // Save PDF file with invoice number and customer name
      final sanitizedCustomer = invoice.customerName.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_');
      final fileName = '${invoice.invoiceNumber}_$sanitizedCustomer.pdf';
      final file = File(path.join(invoicesDir.path, fileName));
      await file.writeAsBytes(pdfBytes);

      // Also save as finalized
      await appState.saveInvoiceToRecents(invoice);

      if (context.mounted) {
        Navigator.pop(context); // Close loading dialog
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('PDF exported successfully to ${file.path}'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context); // Close loading dialog
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to export PDF: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    }
  }

  Widget _buildCustomerDropdown(AppState appState, Invoice invoice) {
    final customers = appState.settings.customers;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(8),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          hint: const Text('Select Customer'),
          value: invoice.customerId.isEmpty ? null : invoice.customerId,
          items: customers.map((customer) {
            return DropdownMenuItem(
              value: customer.id,
              child: Text(customer.name),
            );
          }).toList(),
          onChanged: (customerId) {
            if (customerId != null) {
              final customer = customers.firstWhere((c) => c.id == customerId);
              appState.updateInvoiceData(
                invoice.copyWith(
                  customerId: customer.id,
                  customerName: customer.name,
                  customerPreviousBalance: customer.previousBalance,
                ),
              );
            }
          },
        ),
      ),
    );
  }
}
