class ReceiptItem {
  final String description;
  final int quantity;
  final double unitPrice;

  ReceiptItem({
    this.description = '',
    this.quantity = 1,
    this.unitPrice = 0.0,
  });

  double get amount => quantity * unitPrice;

  ReceiptItem copyWith({
    String? description,
    int? quantity,
    double? unitPrice,
  }) {
    return ReceiptItem(
      description: description ?? this.description,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice ?? this.unitPrice,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'description': description,
      'qty': quantity,
      'unit_price': unitPrice,
      'amount': amount,
    };
  }

  factory ReceiptItem.fromJson(Map<String, dynamic> json) {
    final qtyVal = json['qty'] ?? json['quantity'] ?? 1;
    final upVal = json['unit_price'] ?? json['unitPrice'] ?? 0.0;
    final quantity = qtyVal is int ? qtyVal : int.tryParse(qtyVal.toString()) ?? 1;
    final unitPrice = upVal is int ? (upVal as int).toDouble() : (upVal as double);
    return ReceiptItem(
      description: json['description'] ?? '',
      quantity: quantity,
      unitPrice: unitPrice,
    );
  }
}

class Receipt {
  final String receiptNumber;
  final String date;
  final String customerName;
  final String issuer;
  final List<ReceiptItem> items;
  final double amountReceived;
  final String paymentMethod;

  Receipt({
    this.receiptNumber = '',
    this.date = '',
    this.customerName = '',
    this.issuer = '',
    List<ReceiptItem>? items,
    this.amountReceived = 0.0,
    this.paymentMethod = 'Cash',
  }) : items = items ?? [];

  double get totalAmount => items.fold(0.0, (sum, item) => sum + item.amount);

  double get balance => totalAmount - amountReceived;

  Receipt copyWith({
    String? receiptNumber,
    String? date,
    String? customerName,
    String? issuer,
    List<ReceiptItem>? items,
    double? amountReceived,
    String? paymentMethod,
  }) {
    return Receipt(
      receiptNumber: receiptNumber ?? this.receiptNumber,
      date: date ?? this.date,
      customerName: customerName ?? this.customerName,
      issuer: issuer ?? this.issuer,
      items: items ?? this.items,
      amountReceived: amountReceived ?? this.amountReceived,
      paymentMethod: paymentMethod ?? this.paymentMethod,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'receiptNumber': receiptNumber,
      'date': date,
      'customerName': customerName,
      'items': items.map((i) => i.toJson()).toList(),
      'amountReceived': amountReceived,
      'paymentMethod': paymentMethod,
      'totalAmount': totalAmount,
    };
  }

  factory Receipt.fromJson(Map<String, dynamic> json) {
    final itemsJson = json['items'] as List<dynamic>?;
    return Receipt(
      receiptNumber: json['receiptNumber'] ?? json['number'] ?? '',
      date: json['date'] ?? '',
      customerName: json['customerName'] ?? json['customer'] ?? '',
      items: itemsJson != null
          ? itemsJson.map((e) => ReceiptItem.fromJson(e as Map<String, dynamic>)).toList()
          : [],
      amountReceived: (json['amountReceived'] ?? 0.0) is int
          ? (json['amountReceived'] as int).toDouble()
          : (json['amountReceived'] ?? 0.0) as double,
      paymentMethod: json['paymentMethod'] ?? 'Cash',
    );
  }
}
