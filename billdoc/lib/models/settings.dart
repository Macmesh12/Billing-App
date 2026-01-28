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
}
