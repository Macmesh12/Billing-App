class WaybillItem {
  String description;
  int quantity;
  double weight;
  String unit;

  WaybillItem({
    required this.description,
    required this.quantity,
    required this.weight,
    required this.unit,
  });

  WaybillItem copyWith({
    String? description,
    int? quantity,
    double? weight,
    String? unit,
  }) {
    return WaybillItem(
      description: description ?? this.description,
      quantity: quantity ?? this.quantity,
      weight: weight ?? this.weight,
      unit: unit ?? this.unit,
    );
  }
}

class WaybillData {
  String waybillNumber;
  String date;
  String shipperName;
  String shipperAddress;
  String shipperCity;
  String shipperPhone;
  String consigneeName;
  String consigneeAddress;
  String consigneeCity;
  String consigneePhone;
  String originLocation;
  String destinationLocation;
  String carrierName;
  String vehicleNumber;
  String driverName;
  String driverPhone;
  List<WaybillItem> items;
  String specialInstructions;

  WaybillData({
    required this.waybillNumber,
    required this.date,
    required this.shipperName,
    required this.shipperAddress,
    required this.shipperCity,
    required this.shipperPhone,
    required this.consigneeName,
    required this.consigneeAddress,
    required this.consigneeCity,
    required this.consigneePhone,
    required this.originLocation,
    required this.destinationLocation,
    required this.carrierName,
    required this.vehicleNumber,
    required this.driverName,
    required this.driverPhone,
    required this.items,
    required this.specialInstructions,
  });

  int get totalQuantity => items.fold(0, (sum, item) => sum + item.quantity);
  double get totalWeight => items.fold(0, (sum, item) => sum + item.weight);
}
