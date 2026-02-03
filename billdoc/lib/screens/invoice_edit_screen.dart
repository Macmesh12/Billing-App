import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../models/invoice.dart';
import '../widgets/custom_button.dart';

class InvoiceEditScreen extends StatefulWidget {
  const InvoiceEditScreen({super.key});

  @override
  State<InvoiceEditScreen> createState() => _InvoiceEditScreenState();
}

class _InvoiceEditScreenState extends State<InvoiceEditScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _clientNameController;
  late TextEditingController _invoiceNumberController;
  late TextEditingController _invoiceDateController;
  late TextEditingController _dueDateController;
  List<InvoiceItem> _items = [];

  @override
  void initState() {
    super.initState();
    final invoice = context.read<AppState>().invoiceData;
    _clientNameController = TextEditingController(text: invoice.clientName);
    _invoiceNumberController = TextEditingController(text: invoice.invoiceNumber);
    _invoiceDateController = TextEditingController(text: invoice.date);
    _dueDateController = TextEditingController(text: invoice.dueDate);
    _items = List.from(invoice.items);
  }

  @override
  void dispose() {
    _clientNameController.dispose();
    _invoiceNumberController.dispose();
    _invoiceDateController.dispose();
    _dueDateController.dispose();
    super.dispose();
  }

  void _addItem() {
    setState(() {
      _items.add(InvoiceItem(description: '', quantity: 1, unitPrice: 0));
    });
  }

  void _removeItem(int index) {
    setState(() {
      _items.removeAt(index);
    });
  }

  double _calculateSubtotal() {
    return _items.fold(0, (sum, item) => sum + (item.quantity * item.unitPrice));
  }

  Map<String, double> _calculateTotals() {
    final settings = context.read<AppState>().settings;
    final subtotal = _calculateSubtotal();
    
    if (!settings.applyTax) {
      return {'subtotal': subtotal, 'grandTotal': subtotal};
    }

    final nhil = subtotal * (settings.nhilRate / 100);
    final getfund = subtotal * (settings.getfundRate / 100);
    final vat = subtotal * (settings.vatRate / 100);
    final grandTotal = subtotal + nhil + getfund + vat;

    return {
      'subtotal': subtotal,
      'nhil': nhil,
      'getfund': getfund,
      'vat': vat,
      'grandTotal': grandTotal,
    };
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final settings = appState.settings;
    final totals = _calculateTotals();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Invoice'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => appState.setActiveView('home'),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 900),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            padding: const EdgeInsets.all(32),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header removed - company info not in settings
                  const Text(
                    'INVOICE',
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 24),
                  // Client and invoice details
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Bill To:',
                                style: TextStyle(fontWeight: FontWeight.bold)),
                            const SizedBox(height: 8),
                            TextFormField(
                              controller: _clientNameController,
                              decoration: const InputDecoration(
                                labelText: 'Client Name',
                                border: OutlineInputBorder(),
                              ),
                              validator: (v) =>
                                  v?.isEmpty ?? true ? 'Required' : null,
                            ),
                            const SizedBox(height: 12),
                            const SizedBox.shrink(),
                          ],
                        ),
                      ),
                      const SizedBox(width: 24),
                      Expanded(
                        child: Column(
                          children: [
                            TextFormField(
                              controller: _invoiceNumberController,
                              decoration: const InputDecoration(
                                labelText: 'Invoice Number',
                                border: OutlineInputBorder(),
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _invoiceDateController,
                              decoration: const InputDecoration(
                                labelText: 'Invoice Date',
                                border: OutlineInputBorder(),
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _dueDateController,
                              decoration: const InputDecoration(
                                labelText: 'Due Date',
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),
                  // Line items table
                  const Text('Items:',
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  ..._items.asMap().entries.map((entry) {
                    final index = entry.key;
                    final item = entry.value;
                    return _buildLineItem(index, item);
                  }),
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    icon: const Icon(Icons.add),
                    label: const Text('Add Item'),
                    onPressed: _addItem,
                  ),
                  const SizedBox(height: 32),
                  // Totals
                  Align(
                    alignment: Alignment.centerRight,
                    child: Container(
                      width: 300,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.shade300),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        children: [
                          _buildTotalRow(
                              'Subtotal', totals['subtotal']!, 'GHS'),
                          if (settings.applyTax) ...[
                            _buildTotalRow('NHIL (${settings.nhilRate}%)',
                                totals['nhil']!, 'GHS'),
                            _buildTotalRow('GETFund (${settings.getfundRate}%)',
                                totals['getfund']!, 'GHS'),
                            _buildTotalRow('VAT (${settings.vatRate}%)',
                                totals['vat']!, 'GHS'),
                          ],
                          const Divider(),
                          _buildTotalRow('Grand Total', totals['grandTotal']!,
                              'GHS',
                              bold: true),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  // Action buttons
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      OutlinedButton.icon(
                        icon: const Icon(Icons.save_outlined),
                        label: const Text('Save as Draft'),
                        onPressed: () {
                          if (_formKey.currentState!.validate()) {
                            final invoice = Invoice(
                              customerName: _clientNameController.text,
                              invoiceNumber: _invoiceNumberController.text,
                              date: _invoiceDateController.text,
                              dueDate: _dueDateController.text,
                              items: _items,
                              subtotalOverride: totals['subtotal']!,
                              grandTotalOverride: totals['grandTotal']!,
                            );
                            appState.saveInvoiceAsDraft(invoice);
                            appState.updateInvoiceData(invoice);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                  content: Text('Invoice saved as draft')),
                            );
                          }
                        },
                      ),
                      const SizedBox(width: 16),
                      CustomButton(
                        text: 'Finalize Invoice',
                        icon: Icons.check_circle,
                        onPressed: () {
                          if (_formKey.currentState!.validate()) {
                            final invoice = Invoice(
                              customerName: _clientNameController.text,
                              invoiceNumber: _invoiceNumberController.text,
                              date: _invoiceDateController.text,
                              dueDate: _dueDateController.text,
                              items: _items,
                              subtotalOverride: totals['subtotal']!,
                              grandTotalOverride: totals['grandTotal']!,
                            );
                            appState.saveInvoiceToRecents(invoice);
                            appState.updateInvoiceData(invoice);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                  content: Text('Invoice finalized and saved')),
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
        ),
      ),
    );
  }

  Widget _buildLineItem(int index, InvoiceItem item) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: TextFormField(
              initialValue: item.description,
              decoration: const InputDecoration(
                labelText: 'Description',
                border: OutlineInputBorder(),
              ),
              onChanged: (v) {
                setState(() {
                  _items[index] = InvoiceItem(
                    description: v,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discount: item.discount,
                  );
                });
              },
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: TextFormField(
              initialValue: item.quantity.toString(),
              decoration: const InputDecoration(
                labelText: 'Qty',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
              onChanged: (v) {
                setState(() {
                  _items[index] = InvoiceItem(
                    description: item.description,
                    quantity: int.tryParse(v) ?? 1,
                    unitPrice: item.unitPrice,
                    discount: item.discount,
                  );
                });
              },
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 2,
            child: TextFormField(
              initialValue: item.unitPrice.toString(),
              decoration: const InputDecoration(
                labelText: 'Unit Price',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
              onChanged: (v) {
                setState(() {
                  _items[index] = InvoiceItem(
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: double.tryParse(v) ?? 0,
                    discount: item.discount,
                  );
                });
              },
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 100,
            child: Text(
              (item.quantity * item.unitPrice).toStringAsFixed(2),
              textAlign: TextAlign.right,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.delete, color: Colors.red),
            onPressed: () => _removeItem(index),
          ),
        ],
      ),
    );
  }

  Widget _buildTotalRow(String label, double value, String currency,
      {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(
                  fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
          Text('$currency ${value.toStringAsFixed(2)}',
              style: TextStyle(
                  fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
        ],
      ),
    );
  }
}