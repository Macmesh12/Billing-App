import 'document_item.dart';
import 'dart:math';

class InvoiceItem {
  String description;
  int quantity;
  double unitPrice;
  double discount;

  InvoiceItem({
    this.description = '',
    this.quantity = 1,
    this.unitPrice = 0.0,
    this.discount = 0.0,
  });

  double get amount => (quantity * unitPrice) - discount;

  InvoiceItem copyWith({
    String? description,
    int? quantity,
    double? unitPrice,
    double? discount,
  }) {
    return InvoiceItem(
      description: description ?? this.description,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice ?? this.unitPrice,
      discount: discount ?? this.discount,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'description': description,
      'qty': quantity,
      'unit_price': unitPrice,
      'discount': discount,
      'amount': amount,
    };
  }
}

class Invoice {
  final String invoiceNumber;
  final String date;
  final String dueDate;
  final String customerName;
  final String issuer;
  
  final List<InvoiceItem> items;
  final double? subtotalOverride;
  final double? grandTotalOverride;

  // Generate invoice number: INV-YYYY-XXXX (XXXX = 4 random digits)
  static String generateInvoiceNumber() {
    final year = DateTime.now().year;
    final random = Random();
    final randomDigits = (1000 + random.nextInt(9000)).toString(); // 4 digits between 1000-9999
    return 'INV-$year-$randomDigits';
  }

  Invoice({
    this.invoiceNumber = '',
    this.date = '',
    this.dueDate = '',
    this.customerName = '',
    this.issuer = '',
    List<InvoiceItem>? items,
    this.subtotalOverride,
    this.grandTotalOverride,
  }) : items = items ?? [InvoiceItem()];

  // Aliases for compatibility
  String get clientName => customerName;


  double get subtotal {
    return subtotalOverride ??
        items.fold(0.0, (sum, item) => sum + item.amount);
  }

  double get grandTotal => grandTotalOverride ?? subtotal;

  double calculateNhil(double rate) => subtotal * (rate / 100);
  double calculateGetfund(double rate) => subtotal * (rate / 100);
  double calculateVat(double rate) => subtotal * (rate / 100);

  double calculateGrandTotal({
    required bool applyTax,
    double nhilRate = 2.5,
    double getfundRate = 2.5,
    double vatRate = 15.0,
  }) {
    if (!applyTax) {
      return subtotal;
    }
    return subtotal +
        calculateNhil(nhilRate) +
        calculateGetfund(getfundRate) +
        calculateVat(vatRate);
  }

  Invoice copyWith({
    String? invoiceNumber,
    String? date,
    String? dueDate,
    String? customerName,
    String? issuer,
    List<InvoiceItem>? items,
    double? subtotalOverride,
    double? grandTotalOverride,
  }) {
    return Invoice(
      invoiceNumber: invoiceNumber ?? this.invoiceNumber,
      date: date ?? this.date,
      dueDate: dueDate ?? this.dueDate,
      customerName: customerName ?? this.customerName,
      issuer: issuer ?? this.issuer,
      items: items ?? this.items,
      subtotalOverride: subtotalOverride ?? this.subtotalOverride,
      grandTotalOverride: grandTotalOverride ?? this.grandTotalOverride,
    );
  }

  DocumentItem toDocumentItem() {
    return DocumentItem(
      id: invoiceNumber,
      customer: customerName,
      type: 'Invoice',
      date: date,
      number: invoiceNumber,
      location: 'Local',
      amount: grandTotal,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'invoiceNumber': invoiceNumber,
      'date': date,
      'dueDate': dueDate,
      'customerName': customerName,
      'issuer': issuer,
      'items': items.map((i) => i.toJson()).toList(),
      'subtotal': subtotal,
      'grandTotal': grandTotal,
    };
  }
}
