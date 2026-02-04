import 'customer.dart';

class AppSettings {
  final bool applyTax;
  final double nhilRate;
  final double getfundRate;
  final double vatRate;
  final bool enableCustomerManagement;
  final List<Customer> customers;
  final String draftSavePath;
  final String pdfExportPath;
  final String invoiceNote;

  AppSettings({
    this.applyTax = true,
    this.nhilRate = 2.5,
    this.getfundRate = 2.5,
    this.vatRate = 15.0,
    this.enableCustomerManagement = false,
    List<Customer>? customers,
    this.draftSavePath = '',
    this.pdfExportPath = '',
    this.invoiceNote = '',
  }) : customers = customers ?? [];

  AppSettings copyWith({
    bool? applyTax,
    double? nhilRate,
    double? getfundRate,
    double? vatRate,
    bool? enableCustomerManagement,
    List<Customer>? customers,
    String? draftSavePath,
    String? pdfExportPath,
    String? invoiceNote,
  }) {
    return AppSettings(
      applyTax: applyTax ?? this.applyTax,
      nhilRate: nhilRate ?? this.nhilRate,
      getfundRate: getfundRate ?? this.getfundRate,
      vatRate: vatRate ?? this.vatRate,
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
      'nhilRate': nhilRate,
      'getfundRate': getfundRate,
      'vatRate': vatRate,
      'enableCustomerManagement': enableCustomerManagement,
      'customers': customers.map((c) => c.toJson()).toList(),
      'draftSavePath': draftSavePath,
      'pdfExportPath': pdfExportPath,
      'invoiceNote': invoiceNote,
    };
  }

  factory AppSettings.fromJson(Map<String, dynamic> json) {
    return AppSettings(
      applyTax: json['applyTax'] as bool? ?? true,
      nhilRate: (json['nhilRate'] as num?)?.toDouble() ?? 2.5,
      getfundRate: (json['getfundRate'] as num?)?.toDouble() ?? 2.5,
      vatRate: (json['vatRate'] as num?)?.toDouble() ?? 15.0,
      enableCustomerManagement: json['enableCustomerManagement'] as bool? ?? false,
      customers: (json['customers'] as List?)
          ?.map((c) => Customer.fromJson(c as Map<String, dynamic>))
          .toList() ?? [],
      draftSavePath: json['draftSavePath'] as String? ?? '',
      pdfExportPath: json['pdfExportPath'] as String? ?? '',
      invoiceNote: json['invoiceNote'] as String? ?? '',
    );
  }
}
