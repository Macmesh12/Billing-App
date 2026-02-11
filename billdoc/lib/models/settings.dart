import 'customer.dart';
import 'tax_entry.dart';

class AppSettings {
  final bool applyTax;
  final List<TaxEntry> taxes;
  final bool enableCustomerManagement;
  final List<Customer> customers;
  final String draftSavePath;
  final String pdfExportPath;
  final String invoiceNote;

  // ---------- backward-compat convenience getters ----------
  double get nhilRate => taxes
      .where((t) => t.name.toUpperCase() == 'NHIL')
      .fold(0.0, (_, t) => t.rate);
  double get getfundRate => taxes
      .where((t) => t.name.toUpperCase() == 'GETFUND')
      .fold(0.0, (_, t) => t.rate);
  double get vatRate => taxes
      .where((t) => t.name.toUpperCase() == 'VAT')
      .fold(0.0, (_, t) => t.rate);

  /// Only the taxes that are currently enabled.
  List<TaxEntry> get activeTaxes => taxes.where((t) => t.enabled).toList();

  AppSettings({
    this.applyTax = true,
    List<TaxEntry>? taxes,
    this.enableCustomerManagement = false,
    List<Customer>? customers,
    this.draftSavePath = '',
    this.pdfExportPath = '',
    this.invoiceNote = '',
  }) : taxes = taxes ?? List<TaxEntry>.from(TaxEntry.defaults),
       customers = customers ?? [];

  AppSettings copyWith({
    bool? applyTax,
    List<TaxEntry>? taxes,
    bool? enableCustomerManagement,
    List<Customer>? customers,
    String? draftSavePath,
    String? pdfExportPath,
    String? invoiceNote,
  }) {
    return AppSettings(
      applyTax: applyTax ?? this.applyTax,
      taxes: taxes ?? this.taxes,
      enableCustomerManagement:
          enableCustomerManagement ?? this.enableCustomerManagement,
      customers: customers ?? this.customers,
      draftSavePath: draftSavePath ?? this.draftSavePath,
      pdfExportPath: pdfExportPath ?? this.pdfExportPath,
      invoiceNote: invoiceNote ?? this.invoiceNote,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'applyTax': applyTax,
      'taxes': taxes.map((t) => t.toJson()).toList(),
      'enableCustomerManagement': enableCustomerManagement,
      'customers': customers.map((c) => c.toJson()).toList(),
      'draftSavePath': draftSavePath,
      'pdfExportPath': pdfExportPath,
      'invoiceNote': invoiceNote,
    };
  }

  factory AppSettings.fromJson(Map<String, dynamic> json) {
    // Migrate from old format that had nhilRate/getfundRate/vatRate
    List<TaxEntry> taxes;
    if (json.containsKey('taxes')) {
      taxes = (json['taxes'] as List)
          .map((t) => TaxEntry.fromJson(t as Map<String, dynamic>))
          .toList();
    } else {
      // Legacy migration: build list from old individual fields
      taxes = [
        TaxEntry(
          name: 'NHIL',
          rate: (json['nhilRate'] as num?)?.toDouble() ?? 2.5,
        ),
        TaxEntry(
          name: 'GETFund',
          rate: (json['getfundRate'] as num?)?.toDouble() ?? 2.5,
        ),
        TaxEntry(
          name: 'VAT',
          rate: (json['vatRate'] as num?)?.toDouble() ?? 15.0,
        ),
      ];
    }

    return AppSettings(
      applyTax: json['applyTax'] as bool? ?? true,
      taxes: taxes,
      enableCustomerManagement:
          json['enableCustomerManagement'] as bool? ?? false,
      customers:
          (json['customers'] as List?)
              ?.map((c) => Customer.fromJson(c as Map<String, dynamic>))
              .toList() ??
          [],
      draftSavePath: json['draftSavePath'] as String? ?? '',
      pdfExportPath: json['pdfExportPath'] as String? ?? '',
      invoiceNote: json['invoiceNote'] as String? ?? '',
    );
  }
}
