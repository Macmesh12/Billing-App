import 'document_item.dart';
import 'dart:math';

class WaybillItem {
  String description;
  int quantity;
  double weight;
  String unit;

  WaybillItem({
    this.description = '',
    this.quantity = 1,
    this.weight = 0.0,
    this.unit = 'kg',
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

  Map<String, dynamic> toJson() {
    return {
      'description': description,
      'quantity': quantity,
      'weight': weight,
      'unit': unit,
    };
  }
}

class Waybill {
  final String waybillNumber;
  final String date;
  final String issuer;
  final String shipperName;
  final String shipperAddress;
  final String shipperCity;
  final String shipperPhone;
  final String consigneeName;
  final String consigneeAddress;
  final String consigneeCity;
  final String consigneePhone;
  final String originLocation;
  final String destinationLocation;
  final String carrierName;
  final String vehicleNumber;
  final String driverName;
  final String driverPhone;
  final List<WaybillItem> items;
  final String specialInstructions;

  // Generate waybill number: WBL-YYYY-XXXX (XXXX = 4 random digits)
  static String generateWaybillNumber() {
    final year = DateTime.now().year;
    final random = Random();
    final randomDigits = (1000 + random.nextInt(9000)).toString();
    return 'WBL-$year-$randomDigits';
  }

  Waybill({
    this.waybillNumber = '',
    this.date = '',
    this.issuer = '',
    this.shipperName = '',
    this.shipperAddress = '',
    this.shipperCity = '',
    this.shipperPhone = '',
    this.consigneeName = '',
    this.consigneeAddress = '',
    this.consigneeCity = '',
    this.consigneePhone = '',
    this.originLocation = '',
    this.destinationLocation = '',
    this.carrierName = '',
    this.vehicleNumber = '',
    this.driverName = '',
    this.driverPhone = '',
    List<WaybillItem>? items,
    this.specialInstructions = '',
  }) : items = items ?? [WaybillItem()];

  int get totalQuantity => items.fold(0, (sum, item) => sum + item.quantity);
  double get totalWeight => items.fold(0.0, (sum, item) => sum + item.weight);

  Waybill copyWith({
    String? waybillNumber,
    String? date,
    String? issuer,
    String? shipperName,
    String? shipperAddress,
    String? shipperCity,
    String? shipperPhone,
    String? consigneeName,
    String? consigneeAddress,
    String? consigneeCity,
    String? consigneePhone,
    String? originLocation,
    String? destinationLocation,
    String? carrierName,
    String? vehicleNumber,
    String? driverName,
    String? driverPhone,
    List<WaybillItem>? items,
    String? specialInstructions,
  }) {
    return Waybill(
      waybillNumber: waybillNumber ?? this.waybillNumber,
      date: date ?? this.date,
      issuer: issuer ?? this.issuer,
      shipperName: shipperName ?? this.shipperName,
      shipperAddress: shipperAddress ?? this.shipperAddress,
      shipperCity: shipperCity ?? this.shipperCity,
      shipperPhone: shipperPhone ?? this.shipperPhone,
      consigneeName: consigneeName ?? this.consigneeName,
      consigneeAddress: consigneeAddress ?? this.consigneeAddress,
      consigneeCity: consigneeCity ?? this.consigneeCity,
      consigneePhone: consigneePhone ?? this.consigneePhone,
      originLocation: originLocation ?? this.originLocation,
      destinationLocation: destinationLocation ?? this.destinationLocation,
      carrierName: carrierName ?? this.carrierName,
      vehicleNumber: vehicleNumber ?? this.vehicleNumber,
      driverName: driverName ?? this.driverName,
      driverPhone: driverPhone ?? this.driverPhone,
      items: items ?? this.items,
      specialInstructions: specialInstructions ?? this.specialInstructions,
    );
  }

  DocumentItem toDocumentItem() {
    return DocumentItem(
      id: waybillNumber,
      customer: consigneeName,
      type: 'Waybill',
      date: date,
      number: waybillNumber,
      location: destinationLocation,
      amount: totalWeight,
    );
  }
}
