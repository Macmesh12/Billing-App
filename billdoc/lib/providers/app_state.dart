import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../models/invoice.dart';
import '../models/receipt.dart';
import '../models/waybill.dart';
import '../models/settings.dart';
import '../models/customer.dart';
import '../services/storage_service.dart';
import '../services/pdf_service.dart';

class AppState with ChangeNotifier {
  String _activeView = 'home';
  String _activeTab = 'invoices';
  Invoice _invoiceData = Invoice();
  Receipt _receiptData = Receipt();
  Waybill _waybillData = Waybill();
  AppSettings _settings = AppSettings();
  bool _setupComplete = false;

  // Lists for recent and draft items
  List<Invoice> _recentInvoices = [];
  List<Invoice> _draftInvoices = [];
  List<Receipt> _recentReceipts = [];
  List<Receipt> _draftReceipts = [];
  List<Waybill> _recentWaybills = [];
  List<Waybill> _draftWaybills = [];

  AppState() {
    _loadSettings();
  }

  String get activeView => _activeView;
  String get activeTab => _activeTab;
  Invoice get invoiceData => _invoiceData;
  Receipt get receiptData => _receiptData;
  Waybill get waybillData => _waybillData;
  AppSettings get settings => _settings;
  bool get setupComplete => _setupComplete;

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
    _saveSettings();
    _loadInvoicesFromStorage();
    notifyListeners();
  }

  // Load settings from SharedPreferences
  Future<void> _loadSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final settingsJson = prefs.getString('app_settings');
      if (settingsJson != null) {
        final Map<String, dynamic> json = jsonDecode(settingsJson);
        _settings = AppSettings.fromJson(json);
        notifyListeners();
      }
      await _loadInvoicesFromStorage();
    } catch (e) {
      print('Error loading settings: $e');
    }
  }

  // Save settings to SharedPreferences
  Future<void> _saveSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final settingsJson = jsonEncode(_settings.toJson());
      await prefs.setString('app_settings', settingsJson);
    } catch (e) {
      print('Error saving settings: $e');
    }
  }

  Future<void> _loadInvoicesFromStorage() async {
    try {
      // Load drafts and finalized invoices from shared paths if configured
      _draftInvoices = await StorageService.loadInvoiceDrafts(_settings.draftSavePath);
      _recentInvoices = await StorageService.loadRecentInvoices(_settings.pdfExportPath);
      notifyListeners();
    } catch (e) {
      debugPrint('Error loading invoices from storage: $e');
    }
  }

  // Save invoice as draft
  Future<void> saveInvoiceAsDraft(Invoice invoice) async {
    await StorageService.saveInvoiceDraft(invoice, _settings.draftSavePath);
    await _loadInvoicesFromStorage();
  }

  // Save invoice to recents (finalized)
  Future<void> saveInvoiceToRecents(Invoice invoice) async {
    await StorageService.saveInvoiceToRecents(invoice, _settings.pdfExportPath);
    await PdfService.generateAndSave(invoice, directory: _settings.pdfExportPath);
    await _loadInvoicesFromStorage();
  }

  // Save receipt as draft
  Future<void> saveReceiptAsDraft(Receipt receipt) async {
    await StorageService.saveReceiptDraft(receipt, _settings.draftSavePath);
    _draftReceipts.removeWhere((r) => r.receiptNumber == receipt.receiptNumber);
    _draftReceipts.insert(0, receipt);
    if (_draftReceipts.length > 50) {
      _draftReceipts = _draftReceipts.sublist(0, 50);
    }
    notifyListeners();
  }

  // Save receipt to recents
  Future<void> saveReceiptToRecents(Receipt receipt) async {
    await StorageService.saveReceiptToRecents(receipt, _settings.pdfExportPath);
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
  Future<void> saveWaybillAsDraft(Waybill waybill) async {
    await StorageService.saveWaybillDraft(waybill, _settings.draftSavePath);
    _draftWaybills.removeWhere((w) => w.waybillNumber == waybill.waybillNumber);
    _draftWaybills.insert(0, waybill);
    if (_draftWaybills.length > 50) {
      _draftWaybills = _draftWaybills.sublist(0, 50);
    }
    notifyListeners();
  }

  // Save waybill to recents
  Future<void> saveWaybillToRecents(Waybill waybill) async {
    await StorageService.saveWaybillToRecents(waybill, _settings.pdfExportPath);
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
  Future<void> deleteInvoiceDraft(Invoice invoice) async {
    await StorageService.deleteInvoiceDraft(invoice, _settings.draftSavePath);
    await _loadInvoicesFromStorage();
  }

  Future<void> deleteReceiptDraft(Receipt receipt) async {
    await StorageService.deleteReceiptDraft(receipt, _settings.draftSavePath);
    _draftReceipts.removeWhere((r) => r.receiptNumber == receipt.receiptNumber);
    notifyListeners();
  }

  Future<void> deleteWaybillDraft(Waybill waybill) async {
    await StorageService.deleteWaybillDraft(waybill, _settings.draftSavePath);
    _draftWaybills.removeWhere((w) => w.waybillNumber == waybill.waybillNumber);
    notifyListeners();
  }

  // Customer management
  void addCustomer(Customer customer) {
    final customers = List<Customer>.from(_settings.customers);
    customers.add(customer);
    _settings = _settings.copyWith(customers: customers);
    _saveSettings();
    notifyListeners();
  }

  void updateCustomer(Customer customer) {
    final customers = List<Customer>.from(_settings.customers);
    final index = customers.indexWhere((c) => c.id == customer.id);
    if (index != -1) {
      customers[index] = customer;
      _settings = _settings.copyWith(customers: customers);
      _saveSettings();
      notifyListeners();
    }
  }

  void deleteCustomer(String customerId) {
    final customers = List<Customer>.from(_settings.customers);
    customers.removeWhere((c) => c.id == customerId);
    _settings = _settings.copyWith(customers: customers);
    _saveSettings();
    notifyListeners();
  }

  void completeSetup() {
    _setupComplete = true;
    notifyListeners();
    // Load documents from file system after setup
    loadAllDocuments();
  }

  // Load all documents from file system
  Future<void> loadAllDocuments() async {
    if (_settings.draftSavePath.isEmpty && _settings.pdfExportPath.isEmpty) {
      return;
    }

    try {
      // Load drafts
      _draftInvoices = await StorageService.loadInvoiceDrafts(_settings.draftSavePath);
      _draftReceipts = await StorageService.loadReceiptDrafts(_settings.draftSavePath);
      _draftWaybills = await StorageService.loadWaybillDrafts(_settings.draftSavePath);

      // Load recents
      _recentInvoices = await StorageService.loadRecentInvoices(_settings.pdfExportPath);
      _recentReceipts = await StorageService.loadRecentReceipts(_settings.pdfExportPath);
      _recentWaybills = await StorageService.loadRecentWaybills(_settings.pdfExportPath);

      notifyListeners();
    } catch (e) {
      print('Error loading documents: $e');
    }
  }

  // Refresh documents (call this when paths change)
  Future<void> refreshDocuments() async {
    await loadAllDocuments();
  }
}
