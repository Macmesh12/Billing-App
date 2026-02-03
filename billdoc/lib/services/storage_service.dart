import 'dart:io';
import 'dart:convert';
import '../models/invoice.dart';
import '../models/receipt.dart';
import '../models/waybill.dart';

class StorageService {
  // Save invoice draft to file
  static Future<void> saveInvoiceDraft(Invoice invoice, String draftPath) async {
    if (draftPath.isEmpty) return;
    
    try {
      final dir = Directory('$draftPath/invoices/drafts');
      if (!await dir.exists()) {
        await dir.create(recursive: true);
      }
      
      // Sanitize customer name for filename
      final sanitizedCustomer = invoice.customerName.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_');
      final filename = '${invoice.invoiceNumber}_$sanitizedCustomer.json';
      final file = File('${dir.path}/$filename');
      final json = {
        'invoiceNumber': invoice.invoiceNumber,
        'date': invoice.date,
        'dueDate': invoice.dueDate,
        'customerName': invoice.customerName,
        'issuer': invoice.issuer,
        'items': invoice.items.map((item) => {
          'description': item.description,
          'quantity': item.quantity,
          'unitPrice': item.unitPrice,
          'discount': item.discount,
        }).toList(),
        'subtotalOverride': invoice.subtotalOverride,
        'grandTotalOverride': invoice.grandTotalOverride,
      };
      
      await file.writeAsString(jsonEncode(json));
    } catch (e) {
      print('Error saving invoice draft: $e');
      rethrow;
    }
  }

  // Save invoice to recents (finalized)
  static Future<void> saveInvoiceToRecents(Invoice invoice, String exportPath) async {
    if (exportPath.isEmpty) return;
    
    try {
      final dir = Directory('$exportPath/invoices');
      if (!await dir.exists()) {
        await dir.create(recursive: true);
      }
      
      // Sanitize customer name for filename
      final sanitizedCustomer = invoice.customerName.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_');
      final filename = '${invoice.invoiceNumber}_$sanitizedCustomer.json';
      final file = File('${dir.path}/$filename');
      final json = {
        'invoiceNumber': invoice.invoiceNumber,
        'date': invoice.date,
        'dueDate': invoice.dueDate,
        'customerName': invoice.customerName,
        'issuer': invoice.issuer,
        'items': invoice.items.map((item) => {
          'description': item.description,
          'quantity': item.quantity,
          'unitPrice': item.unitPrice,
          'discount': item.discount,
        }).toList(),
        'subtotalOverride': invoice.subtotalOverride,
        'grandTotalOverride': invoice.grandTotalOverride,
      };
      
      await file.writeAsString(jsonEncode(json));
    } catch (e) {
      print('Error saving invoice: $e');
      rethrow;
    }
  }

  // Load invoice drafts from file system
  static Future<List<Invoice>> loadInvoiceDrafts(String draftPath) async {
    if (draftPath.isEmpty) return [];
    
    try {
      final dir = Directory('$draftPath/invoices/drafts');
      if (!await dir.exists()) {
        return [];
      }
      
      final files = await dir.list().where((f) => f.path.endsWith('.json')).toList();
      final invoices = <Invoice>[];
      
      for (var file in files) {
        try {
          final content = await File(file.path).readAsString();
          final json = jsonDecode(content);
          final items = (json['items'] as List?)?.map((item) => InvoiceItem(
            description: item['description'] ?? '',
            quantity: item['quantity'] ?? 1,
            unitPrice: (item['unitPrice'] ?? 0).toDouble(),
            discount: (item['discount'] ?? 0).toDouble(),
          )).toList() ?? [];
          
          invoices.add(Invoice(
            invoiceNumber: json['invoiceNumber'] ?? '',
            date: json['date'] ?? '',
            dueDate: json['dueDate'] ?? '',
            customerName: json['customerName'] ?? '',
            issuer: json['issuer'] ?? '',
            items: items,
            subtotalOverride: json['subtotalOverride']?.toDouble(),
            grandTotalOverride: json['grandTotalOverride']?.toDouble(),
          ));
        } catch (e) {
          print('Error loading invoice file ${file.path}: $e');
        }
      }
      
      // Sort by modification time (newest first)
      invoices.sort((a, b) => b.date.compareTo(a.date));
      return invoices;
    } catch (e) {
      print('Error loading invoice drafts: $e');
      return [];
    }
  }

  // Load recent invoices
  static Future<List<Invoice>> loadRecentInvoices(String exportPath) async {
    if (exportPath.isEmpty) return [];
    
    try {
      final dir = Directory('$exportPath/invoices');
      if (!await dir.exists()) {
        return [];
      }
      
      final files = await dir.list().where((f) => f.path.endsWith('.json')).toList();
      final invoices = <Invoice>[];
      
      for (var file in files) {
        try {
          final content = await File(file.path).readAsString();
          final json = jsonDecode(content);
          final items = (json['items'] as List?)?.map((item) => InvoiceItem(
            description: item['description'] ?? '',
            quantity: item['quantity'] ?? 1,
            unitPrice: (item['unitPrice'] ?? 0).toDouble(),
            discount: (item['discount'] ?? 0).toDouble(),
          )).toList() ?? [];
          
          invoices.add(Invoice(
            invoiceNumber: json['invoiceNumber'] ?? '',
            date: json['date'] ?? '',
            dueDate: json['dueDate'] ?? '',
            customerName: json['customerName'] ?? '',
            issuer: json['issuer'] ?? '',
            items: items,
            subtotalOverride: json['subtotalOverride']?.toDouble(),
            grandTotalOverride: json['grandTotalOverride']?.toDouble(),
          ));
        } catch (e) {
          print('Error loading invoice file ${file.path}: $e');
        }
      }
      
      invoices.sort((a, b) => b.date.compareTo(a.date));
      return invoices;
    } catch (e) {
      print('Error loading recent invoices: $e');
      return [];
    }
  }

  // Save receipt draft
  static Future<void> saveReceiptDraft(Receipt receipt, String draftPath) async {
    if (draftPath.isEmpty) return;
    
    try {
      final dir = Directory('$draftPath/receipts/drafts');
      if (!await dir.exists()) {
        await dir.create(recursive: true);
      }
      
      // Sanitize customer name for filename
      final sanitizedCustomer = receipt.customerName.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_');
      final filename = '${receipt.receiptNumber}_$sanitizedCustomer.json';
      final file = File('${dir.path}/$filename');
      await file.writeAsString(jsonEncode(receipt.toJson()));
    } catch (e) {
      print('Error saving receipt draft: $e');
      rethrow;
    }
  }

  // Save receipt to recents
  static Future<void> saveReceiptToRecents(Receipt receipt, String exportPath) async {
    if (exportPath.isEmpty) return;
    
    try {
      final dir = Directory('$exportPath/receipts');
      if (!await dir.exists()) {
        await dir.create(recursive: true);
      }
      
      // Sanitize customer name for filename
      final sanitizedCustomer = receipt.customerName.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_');
      final filename = '${receipt.receiptNumber}_$sanitizedCustomer.json';
      final file = File('${dir.path}/$filename');
      await file.writeAsString(jsonEncode(receipt.toJson()));
    } catch (e) {
      print('Error saving receipt: $e');
      rethrow;
    }
  }

  // Load receipt drafts
  static Future<List<Receipt>> loadReceiptDrafts(String draftPath) async {
    if (draftPath.isEmpty) return [];
    
    try {
      final dir = Directory('$draftPath/receipts/drafts');
      if (!await dir.exists()) {
        return [];
      }
      
      final files = await dir.list().where((f) => f.path.endsWith('.json')).toList();
      final receipts = <Receipt>[];
      
      for (var file in files) {
        try {
          final content = await File(file.path).readAsString();
          final json = jsonDecode(content);
          receipts.add(Receipt.fromJson(json));
        } catch (e) {
          print('Error loading receipt file ${file.path}: $e');
        }
      }
      
      receipts.sort((a, b) => b.date.compareTo(a.date));
      return receipts;
    } catch (e) {
      print('Error loading receipt drafts: $e');
      return [];
    }
  }

  // Load recent receipts
  static Future<List<Receipt>> loadRecentReceipts(String exportPath) async {
    if (exportPath.isEmpty) return [];
    
    try {
      final dir = Directory('$exportPath/receipts');
      if (!await dir.exists()) {
        return [];
      }
      
      final files = await dir.list().where((f) => f.path.endsWith('.json')).toList();
      final receipts = <Receipt>[];
      
      for (var file in files) {
        try {
          final content = await File(file.path).readAsString();
          final json = jsonDecode(content);
          receipts.add(Receipt.fromJson(json));
        } catch (e) {
          print('Error loading receipt file ${file.path}: $e');
        }
      }
      
      receipts.sort((a, b) => b.date.compareTo(a.date));
      return receipts;
    } catch (e) {
      print('Error loading recent receipts: $e');
      return [];
    }
  }

  // Save waybill draft
  static Future<void> saveWaybillDraft(Waybill waybill, String draftPath) async {
    if (draftPath.isEmpty) return;
    
    try {
      final dir = Directory('$draftPath/waybills/drafts');
      if (!await dir.exists()) {
        await dir.create(recursive: true);
      }
      
      // Sanitize consignee name for filename
      final sanitizedConsignee = waybill.consigneeName.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_');
      final filename = '${waybill.waybillNumber}_$sanitizedConsignee.json';
      final file = File('${dir.path}/$filename');
      final json = {
        'waybillNumber': waybill.waybillNumber,
        'date': waybill.date,
        'issuer': waybill.issuer,
        'shipperName': waybill.shipperName,
        'shipperAddress': waybill.shipperAddress,
        'shipperCity': waybill.shipperCity,
        'shipperPhone': waybill.shipperPhone,
        'consigneeName': waybill.consigneeName,
        'consigneeAddress': waybill.consigneeAddress,
        'consigneeCity': waybill.consigneeCity,
        'consigneePhone': waybill.consigneePhone,
        'originLocation': waybill.originLocation,
        'destinationLocation': waybill.destinationLocation,
        'carrierName': waybill.carrierName,
        'vehicleNumber': waybill.vehicleNumber,
        'driverName': waybill.driverName,
        'driverPhone': waybill.driverPhone,
        'items': waybill.items.map((item) => item.toJson()).toList(),
        'specialInstructions': waybill.specialInstructions,
      };
      
      await file.writeAsString(jsonEncode(json));
    } catch (e) {
      print('Error saving waybill draft: $e');
      rethrow;
    }
  }

  // Save waybill to recents
  static Future<void> saveWaybillToRecents(Waybill waybill, String exportPath) async {
    if (exportPath.isEmpty) return;
    
    try {
      final dir = Directory('$exportPath/waybills');
      if (!await dir.exists()) {
        await dir.create(recursive: true);
      }
      
      // Sanitize consignee name for filename
      final sanitizedConsignee = waybill.consigneeName.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_');
      final filename = '${waybill.waybillNumber}_$sanitizedConsignee.json';
      final file = File('${dir.path}/$filename');
      final json = {
        'waybillNumber': waybill.waybillNumber,
        'date': waybill.date,
        'issuer': waybill.issuer,
        'shipperName': waybill.shipperName,
        'shipperAddress': waybill.shipperAddress,
        'shipperCity': waybill.shipperCity,
        'shipperPhone': waybill.shipperPhone,
        'consigneeName': waybill.consigneeName,
        'consigneeAddress': waybill.consigneeAddress,
        'consigneeCity': waybill.consigneeCity,
        'consigneePhone': waybill.consigneePhone,
        'originLocation': waybill.originLocation,
        'destinationLocation': waybill.destinationLocation,
        'carrierName': waybill.carrierName,
        'vehicleNumber': waybill.vehicleNumber,
        'driverName': waybill.driverName,
        'driverPhone': waybill.driverPhone,
        'items': waybill.items.map((item) => item.toJson()).toList(),
        'specialInstructions': waybill.specialInstructions,
      };
      
      await file.writeAsString(jsonEncode(json));
    } catch (e) {
      print('Error saving waybill: $e');
      rethrow;
    }
  }

  // Load waybill drafts
  static Future<List<Waybill>> loadWaybillDrafts(String draftPath) async {
    if (draftPath.isEmpty) return [];
    
    try {
      final dir = Directory('$draftPath/waybills/drafts');
      if (!await dir.exists()) {
        return [];
      }
      
      final files = await dir.list().where((f) => f.path.endsWith('.json')).toList();
      final waybills = <Waybill>[];
      
      for (var file in files) {
        try {
          final content = await File(file.path).readAsString();
          final json = jsonDecode(content);
          final items = (json['items'] as List?)?.map((item) => WaybillItem(
            description: item['description'] ?? '',
            quantity: item['quantity'] ?? 1,
            weight: (item['weight'] ?? 0).toDouble(),
            unit: item['unit'] ?? 'kg',
          )).toList() ?? [];
          
          waybills.add(Waybill(
            waybillNumber: json['waybillNumber'] ?? '',
            date: json['date'] ?? '',
            issuer: json['issuer'] ?? '',
            shipperName: json['shipperName'] ?? '',
            shipperAddress: json['shipperAddress'] ?? '',
            shipperCity: json['shipperCity'] ?? '',
            shipperPhone: json['shipperPhone'] ?? '',
            consigneeName: json['consigneeName'] ?? '',
            consigneeAddress: json['consigneeAddress'] ?? '',
            consigneeCity: json['consigneeCity'] ?? '',
            consigneePhone: json['consigneePhone'] ?? '',
            originLocation: json['originLocation'] ?? '',
            destinationLocation: json['destinationLocation'] ?? '',
            carrierName: json['carrierName'] ?? '',
            vehicleNumber: json['vehicleNumber'] ?? '',
            driverName: json['driverName'] ?? '',
            driverPhone: json['driverPhone'] ?? '',
            items: items,
            specialInstructions: json['specialInstructions'] ?? '',
          ));
        } catch (e) {
          print('Error loading waybill file ${file.path}: $e');
        }
      }
      
      waybills.sort((a, b) => b.date.compareTo(a.date));
      return waybills;
    } catch (e) {
      print('Error loading waybill drafts: $e');
      return [];
    }
  }

  // Load recent waybills
  static Future<List<Waybill>> loadRecentWaybills(String exportPath) async {
    if (exportPath.isEmpty) return [];
    
    try {
      final dir = Directory('$exportPath/waybills');
      if (!await dir.exists()) {
        return [];
      }
      
      final files = await dir.list().where((f) => f.path.endsWith('.json')).toList();
      final waybills = <Waybill>[];
      
      for (var file in files) {
        try {
          final content = await File(file.path).readAsString();
          final json = jsonDecode(content);
          final items = (json['items'] as List?)?.map((item) => WaybillItem(
            description: item['description'] ?? '',
            quantity: item['quantity'] ?? 1,
            weight: (item['weight'] ?? 0).toDouble(),
            unit: item['unit'] ?? 'kg',
          )).toList() ?? [];
          
          waybills.add(Waybill(
            waybillNumber: json['waybillNumber'] ?? '',
            date: json['date'] ?? '',
            issuer: json['issuer'] ?? '',
            shipperName: json['shipperName'] ?? '',
            shipperAddress: json['shipperAddress'] ?? '',
            shipperCity: json['shipperCity'] ?? '',
            shipperPhone: json['shipperPhone'] ?? '',
            consigneeName: json['consigneeName'] ?? '',
            consigneeAddress: json['consigneeAddress'] ?? '',
            consigneeCity: json['consigneeCity'] ?? '',
            consigneePhone: json['consigneePhone'] ?? '',
            originLocation: json['originLocation'] ?? '',
            destinationLocation: json['destinationLocation'] ?? '',
            carrierName: json['carrierName'] ?? '',
            vehicleNumber: json['vehicleNumber'] ?? '',
            driverName: json['driverName'] ?? '',
            driverPhone: json['driverPhone'] ?? '',
            items: items,
            specialInstructions: json['specialInstructions'] ?? '',
          ));
        } catch (e) {
          print('Error loading waybill file ${file.path}: $e');
        }
      }
      
      waybills.sort((a, b) => b.date.compareTo(a.date));
      return waybills;
    } catch (e) {
      print('Error loading recent waybills: $e');
      return [];
    }
  }

  // Delete draft file
  static Future<void> deleteInvoiceDraft(Invoice invoice, String draftPath) async {
    if (draftPath.isEmpty) return;
    try {
      final file = File('$draftPath/invoices/drafts/invoice_${invoice.invoiceNumber}.json');
      if (await file.exists()) {
        await file.delete();
      }
    } catch (e) {
      print('Error deleting invoice draft: $e');
    }
  }

  static Future<void> deleteReceiptDraft(Receipt receipt, String draftPath) async {
    if (draftPath.isEmpty) return;
    try {
      final file = File('$draftPath/receipts/drafts/receipt_${receipt.receiptNumber}.json');
      if (await file.exists()) {
        await file.delete();
      }
    } catch (e) {
      print('Error deleting receipt draft: $e');
    }
  }

  static Future<void> deleteWaybillDraft(Waybill waybill, String draftPath) async {
    if (draftPath.isEmpty) return;
    try {
      final file = File('$draftPath/waybills/drafts/waybill_${waybill.waybillNumber}.json');
      if (await file.exists()) {
        await file.delete();
      }
    } catch (e) {
      print('Error deleting waybill draft: $e');
    }
  }
}
