import 'package:flutter/material.dart';
import '../models/invoice_data.dart';
import '../models/receipt_data.dart';
import '../models/waybill_data.dart';
import '../models/document_item.dart';

class AppState extends ChangeNotifier {
  String _activeView = 'home';
  String _activeTab = 'invoices';
  
  InvoiceData _invoiceData = InvoiceData(
    invoiceNumber: 'INV-2026-001',
    date: '2026-01-25',
    classification: 'Standard',
    customerName: 'Acme Corporation',
    customerAddress: '123 Business Park',
    customerCity: 'Accra, Ghana',
    lineItems: [
      LineItem(
        description: 'Web Development Services',
        qty: 40,
        unitPrice: 150.00,
        discount: 0,
        amount: 6000.00,
      ),
      LineItem(
        description: 'UI/UX Design Consultation',
        qty: 20,
        unitPrice: 120.00,
        discount: 10,
        amount: 2160.00,
      ),
    ],
    notes: 'Payment due within 30 days. Thank you for your business!',
  );

  ReceiptData _receiptData = ReceiptData(
    receiptNumber: 'RCP-2026-001',
    date: '2026-01-25',
    customerName: 'Acme Corporation',
    customerAddress: '123 Business Park',
    customerCity: 'Accra, Ghana',
    paymentMethod: 'Bank Transfer',
    amountReceived: 8500.50,
    paymentFor: 'Payment for Web Development Services',
    referenceNumber: 'INV-2026-001',
    notes: 'Thank you for your payment!',
  );

  WaybillData _waybillData = WaybillData(
    waybillNumber: 'WB-2026-001',
    date: '2026-01-25',
    shipperName: 'Tech Innovations Ltd',
    shipperAddress: '456 Industrial Zone',
    shipperCity: 'Accra, Ghana',
    shipperPhone: '+233 24 123 4567',
    consigneeName: 'Global Solutions Inc',
    consigneeAddress: '789 Business Center',
    consigneeCity: 'Kumasi, Ghana',
    consigneePhone: '+233 24 987 6543',
    originLocation: 'Accra',
    destinationLocation: 'Kumasi',
    carrierName: 'Express Logistics Ltd',
    vehicleNumber: 'GH-1234-20',
    driverName: 'Kwame Mensah',
    driverPhone: '+233 24 555 1234',
    items: [
      WaybillItem(
        description: 'Computer Equipment',
        quantity: 10,
        weight: 150.00,
        unit: 'kg',
      ),
      WaybillItem(
        description: 'Office Furniture',
        quantity: 5,
        weight: 200.00,
        unit: 'kg',
      ),
    ],
    specialInstructions: 'Handle with care. Fragile items. Deliver during business hours only.',
  );

  // Sample data
  final List<DocumentItem> recentInvoices = [
    DocumentItem(
      id: '1',
      customer: 'Acme Corporation',
      type: 'Standard',
      date: '2026-01-20',
      number: 'INV-2026-001',
      location: 'Accra',
      amount: 8500.50,
    ),
    DocumentItem(
      id: '2',
      customer: 'Tech Innovations Ltd',
      type: 'Proforma',
      date: '2026-01-18',
      number: 'INV-2026-002',
      location: 'Kumasi',
      amount: 12300.00,
    ),
    DocumentItem(
      id: '3',
      customer: 'Global Solutions Inc',
      type: 'Standard',
      date: '2026-01-15',
      number: 'INV-2026-003',
      location: 'Takoradi',
      amount: 6750.25,
    ),
  ];

  final List<DocumentItem> draftInvoices = [
    DocumentItem(
      id: '4',
      customer: 'Startup Hub Ghana',
      type: 'Draft',
      date: '2026-01-24',
      number: 'DRAFT-001',
      location: 'Accra',
      amount: 4500.00,
    ),
    DocumentItem(
      id: '5',
      customer: 'E-Commerce Plus',
      type: 'Draft',
      date: '2026-01-23',
      number: 'DRAFT-002',
      location: 'Tema',
      amount: 9200.00,
    ),
  ];

  final List<DocumentItem> recentReceipts = [
    DocumentItem(
      id: 'r1',
      customer: 'Acme Corporation',
      type: 'Bank Transfer',
      date: '2026-01-22',
      number: 'RCP-2026-001',
      location: 'Accra',
      amount: 8500.50,
    ),
    DocumentItem(
      id: 'r2',
      customer: 'Tech Innovations Ltd',
      type: 'Cash',
      date: '2026-01-19',
      number: 'RCP-2026-002',
      location: 'Kumasi',
      amount: 5400.00,
    ),
    DocumentItem(
      id: 'r3',
      customer: 'Global Solutions Inc',
      type: 'Mobile Money',
      date: '2026-01-17',
      number: 'RCP-2026-003',
      location: 'Takoradi',
      amount: 3250.75,
    ),
  ];

  final List<DocumentItem> recentWaybills = [
    DocumentItem(
      id: 'w1',
      customer: 'Express Logistics Ltd',
      type: 'Accra → Kumasi',
      date: '2026-01-23',
      number: 'WB-2026-001',
      location: 'In Transit',
      amount: 350.00,
    ),
    DocumentItem(
      id: 'w2',
      customer: 'Swift Carriers Ltd',
      type: 'Kumasi → Takoradi',
      date: '2026-01-21',
      number: 'WB-2026-002',
      location: 'Delivered',
      amount: 280.00,
    ),
    DocumentItem(
      id: 'w3',
      customer: 'Ghana Freight Co',
      type: 'Accra → Tamale',
      date: '2026-01-19',
      number: 'WB-2026-003',
      location: 'In Transit',
      amount: 450.00,
    ),
  ];

  final List<DocumentItem> draftReceipts = [
    DocumentItem(
      id: 'rd1',
      customer: 'Premium Services Ltd',
      type: 'Draft',
      date: '2026-01-24',
      number: 'RCP-DRAFT-001',
      location: 'Accra',
      amount: 2100.00,
    ),
  ];

  final List<DocumentItem> draftWaybills = [
    DocumentItem(
      id: 'wd1',
      customer: 'Transport Solutions',
      type: 'Draft',
      date: '2026-01-25',
      number: 'WB-DRAFT-001',
      location: 'Pending',
      amount: 320.00,
    ),
  ];

  String get activeView => _activeView;
  String get activeTab => _activeTab;
  InvoiceData get invoiceData => _invoiceData;
  ReceiptData get receiptData => _receiptData;
  WaybillData get waybillData => _waybillData;

  void setActiveView(String view) {
    _activeView = view;
    notifyListeners();
  }

  void setActiveTab(String tab) {
    _activeTab = tab;
    notifyListeners();
  }

  void updateInvoiceData(InvoiceData data) {
    _invoiceData = data;
    notifyListeners();
  }

  void updateReceiptData(ReceiptData data) {
    _receiptData = data;
    notifyListeners();
  }

  void updateWaybillData(WaybillData data) {
    _waybillData = data;
    notifyListeners();
  }
}
