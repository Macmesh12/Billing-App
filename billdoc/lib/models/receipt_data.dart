class ReceiptData {
  String receiptNumber;
  String date;
  String customerName;
  String customerAddress;
  String customerCity;
  String paymentMethod;
  double amountReceived;
  String paymentFor;
  String referenceNumber;
  String notes;

  ReceiptData({
    required this.receiptNumber,
    required this.date,
    required this.customerName,
    required this.customerAddress,
    required this.customerCity,
    required this.paymentMethod,
    required this.amountReceived,
    required this.paymentFor,
    required this.referenceNumber,
    required this.notes,
  });

  ReceiptData copyWith({
    String? receiptNumber,
    String? date,
    String? customerName,
    String? customerAddress,
    String? customerCity,
    String? paymentMethod,
    double? amountReceived,
    String? paymentFor,
    String? referenceNumber,
    String? notes,
  }) {
    return ReceiptData(
      receiptNumber: receiptNumber ?? this.receiptNumber,
      date: date ?? this.date,
      customerName: customerName ?? this.customerName,
      customerAddress: customerAddress ?? this.customerAddress,
      customerCity: customerCity ?? this.customerCity,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      amountReceived: amountReceived ?? this.amountReceived,
      paymentFor: paymentFor ?? this.paymentFor,
      referenceNumber: referenceNumber ?? this.referenceNumber,
      notes: notes ?? this.notes,
    );
  }
}
