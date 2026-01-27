class LineItem {
  String description;
  int qty;
  double unitPrice;
  double discount;
  double amount;

  LineItem({
    required this.description,
    required this.qty,
    required this.unitPrice,
    required this.discount,
    required this.amount,
  });

  LineItem copyWith({
    String? description,
    int? qty,
    double? unitPrice,
    double? discount,
    double? amount,
  }) {
    return LineItem(
      description: description ?? this.description,
      qty: qty ?? this.qty,
      unitPrice: unitPrice ?? this.unitPrice,
      discount: discount ?? this.discount,
      amount: amount ?? this.amount,
    );
  }
}

class InvoiceData {
  String invoiceNumber;
  String date;
  String classification;
  String customerName;
  String customerAddress;
  String customerCity;
  List<LineItem> lineItems;
  String notes;

  InvoiceData({
    required this.invoiceNumber,
    required this.date,
    required this.classification,
    required this.customerName,
    required this.customerAddress,
    required this.customerCity,
    required this.lineItems,
    required this.notes,
  });

  double get subtotal {
    return lineItems.fold(0, (sum, item) => sum + item.amount);
  }

  double get nhil => subtotal * 0.025;
  double get getFund => subtotal * 0.025;
  double get vat => subtotal * 0.15;
  double get total => subtotal + nhil + getFund + vat;

  InvoiceData copyWith({
    String? invoiceNumber,
    String? date,
    String? classification,
    String? customerName,
    String? customerAddress,
    String? customerCity,
    List<LineItem>? lineItems,
    String? notes,
  }) {
    return InvoiceData(
      invoiceNumber: invoiceNumber ?? this.invoiceNumber,
      date: date ?? this.date,
      classification: classification ?? this.classification,
      customerName: customerName ?? this.customerName,
      customerAddress: customerAddress ?? this.customerAddress,
      customerCity: customerCity ?? this.customerCity,
      lineItems: lineItems ?? this.lineItems,
      notes: notes ?? this.notes,
    );
  }
}
