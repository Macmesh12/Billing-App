import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import '../models/invoice.dart';
import '../models/receipt.dart';
import '../models/waybill.dart';
import '../models/settings.dart';
import '../models/customer.dart';

class AppState with ChangeNotifier {
  String _activeView = 'home';
  String _activeTab = 'invoices';
  Invoice _invoiceData = Invoice();
  Receipt _receiptData = Receipt();
  Waybill _waybillData = Waybill();
  AppSettings _settings = AppSettings();

  // Lists for recent and draft items
  List<Invoice> _recentInvoices = [];
  List<Invoice> _draftInvoices = [];
  List<Receipt> _recentReceipts = [];
  List<Receipt> _draftReceipts = [];
  List<Waybill> _recentWaybills = [];
  List<Waybill> _draftWaybills = [];

  String get activeView => _activeView;
  String get activeTab => _activeTab;
  Invoice get invoiceData => _invoiceData;
  Receipt get receiptData => _receiptData;
  Waybill get waybillData => _waybillData;
  AppSettings get settings => _settings;

  List<Invoice> get recentInvoices => _recentInvoices;
  List<Invoice> get draftInvoices => _draftInvoices;
  List<Receipt> get recentReceipts => _recentReceipts;
  List<Receipt> get draftReceipts => _draftReceipts;
  List<Waybill> get recentWaybills => _recentWaybills;
  List<Waybill> get draftWaybills => _draftWaybills;

  void setActiveView(String view) {
    _activeView = view;
    notifyListeners();
  }

  void setActiveTab(String tab) {
    _activeTab = tab;
    notifyListeners();
  }

  void updateInvoiceData(Invoice data) {
    _invoiceData = data;
    notifyListeners();
  }

  void updateReceiptData(Receipt data) {
    _receiptData = data;
    notifyListeners();
  }

  void updateWaybillData(Waybill data) {
    _waybillData = data;
    notifyListeners();
  }

  void updateSettings(AppSettings settings) {
    _settings = settings;
    notifyListeners();
  }

  // Save invoice as draft
  void saveInvoiceAsDraft(Invoice invoice) {
    // Remove if already exists
    _draftInvoices.removeWhere((i) => i.invoiceNumber == invoice.invoiceNumber);
    // Add to beginning of list
    _draftInvoices.insert(0, invoice);
    // Keep only last 50 drafts
    if (_draftInvoices.length > 50) {
      _draftInvoices = _draftInvoices.sublist(0, 50);
    }
    notifyListeners();
  }

  // Save invoice to recents (finalized)
  void saveInvoiceToRecents(Invoice invoice) {
    // Remove from drafts if exists
    _draftInvoices.removeWhere((i) => i.invoiceNumber == invoice.invoiceNumber);
    // Remove from recents if already exists
    _recentInvoices.removeWhere(
      (i) => i.invoiceNumber == invoice.invoiceNumber,
    );
    // Add to beginning of recents
    _recentInvoices.insert(0, invoice);
    // Keep only last 100 recents
    if (_recentInvoices.length > 100) {
      _recentInvoices = _recentInvoices.sublist(0, 100);
    }
    notifyListeners();
  }

  // Save receipt as draft
  void saveReceiptAsDraft(Receipt receipt) {
    _draftReceipts.removeWhere((r) => r.receiptNumber == receipt.receiptNumber);
    _draftReceipts.insert(0, receipt);
    if (_draftReceipts.length > 50) {
      _draftReceipts = _draftReceipts.sublist(0, 50);
    }
    notifyListeners();
  }

  // Save receipt to recents
  void saveReceiptToRecents(Receipt receipt) {
    _draftReceipts.removeWhere((r) => r.receiptNumber == receipt.receiptNumber);
    _recentReceipts.removeWhere(
      (r) => r.receiptNumber == receipt.receiptNumber,
    );
    _recentReceipts.insert(0, receipt);
    if (_recentReceipts.length > 100) {
      _recentReceipts = _recentReceipts.sublist(0, 100);
    }
    notifyListeners();
  }

  // Save waybill as draft
  void saveWaybillAsDraft(Waybill waybill) {
    _draftWaybills.removeWhere((w) => w.waybillNumber == waybill.waybillNumber);
    _draftWaybills.insert(0, waybill);
    if (_draftWaybills.length > 50) {
      _draftWaybills = _draftWaybills.sublist(0, 50);
    }
    notifyListeners();
  }

  // Save waybill to recents
  void saveWaybillToRecents(Waybill waybill) {
    _draftWaybills.removeWhere((w) => w.waybillNumber == waybill.waybillNumber);
    _recentWaybills.removeWhere(
      (w) => w.waybillNumber == waybill.waybillNumber,
    );
    _recentWaybills.insert(0, waybill);
    if (_recentWaybills.length > 100) {
      _recentWaybills = _recentWaybills.sublist(0, 100);
    }
    notifyListeners();
  }

  // Delete from drafts
  void deleteInvoiceDraft(Invoice invoice) {
    _draftInvoices.removeWhere((i) => i.invoiceNumber == invoice.invoiceNumber);
    notifyListeners();
  }

  void deleteReceiptDraft(Receipt receipt) {
    _draftReceipts.removeWhere((r) => r.receiptNumber == receipt.receiptNumber);
    notifyListeners();
  }

  void deleteWaybillDraft(Waybill waybill) {
    _draftWaybills.removeWhere((w) => w.waybillNumber == waybill.waybillNumber);
    notifyListeners();
  }

  // Customer management
  void addCustomer(Customer customer) {
    final customers = List<Customer>.from(_settings.customers);
    customers.add(customer);
    _settings = _settings.copyWith(customers: customers);
    notifyListeners();
  }

  void updateCustomer(Customer customer) {
    final customers = List<Customer>.from(_settings.customers);
    final index = customers.indexWhere((c) => c.id == customer.id);
    if (index != -1) {
      customers[index] = customer;
      _settings = _settings.copyWith(customers: customers);
      notifyListeners();
    }
  }

  void deleteCustomer(String customerId) {
    final customers = List<Customer>.from(_settings.customers);
    customers.removeWhere((c) => c.id == customerId);
    _settings = _settings.copyWith(customers: customers);
    notifyListeners();
  }
}
