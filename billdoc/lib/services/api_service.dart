import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // Base URL for Django backend - update this with your actual backend URL
  static const String baseUrl = 'http://localhost:8765';

  // Invoice APIs
  static Future<Map<String, dynamic>> createInvoice(Map<String, dynamic> data) async {
    final response = await http.post(
      Uri.parse('$baseUrl/invoices/api/create/'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(data),
    );
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to create invoice: ${response.body}');
  }

  static Future<Map<String, dynamic>> getInvoice(int id) async {
    final response = await http.get(
      Uri.parse('$baseUrl/invoices/api/$id/'),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to get invoice');
  }

  static Future<http.Response> downloadInvoicePDF(int id) async {
    final response = await http.get(
      Uri.parse('$baseUrl/invoices/$id/pdf/'),
    );
    if (response.statusCode == 200) {
      return response;
    }
    throw Exception('Failed to download invoice PDF');
  }

  // Receipt APIs
  static Future<Map<String, dynamic>> createReceipt(Map<String, dynamic> data) async {
    final response = await http.post(
      Uri.parse('$baseUrl/receipts/api/create/'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(data),
    );
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to create receipt: ${response.body}');
  }

  static Future<Map<String, dynamic>> getReceipt(int id) async {
    final response = await http.get(
      Uri.parse('$baseUrl/receipts/api/$id/'),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to get receipt');
  }

  static Future<http.Response> downloadReceiptPDF(int id) async {
    final response = await http.get(
      Uri.parse('$baseUrl/receipts/$id/pdf/'),
    );
    if (response.statusCode == 200) {
      return response;
    }
    throw Exception('Failed to download receipt PDF');
  }

  // Waybill APIs
  static Future<Map<String, dynamic>> createWaybill(Map<String, dynamic> data) async {
    final response = await http.post(
      Uri.parse('$baseUrl/waybills/api/create/'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(data),
    );
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to create waybill: ${response.body}');
  }

  static Future<Map<String, dynamic>> getWaybill(int id) async {
    final response = await http.get(
      Uri.parse('$baseUrl/waybills/api/$id/'),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to get waybill');
  }

  static Future<http.Response> downloadWaybillPDF(int id) async {
    final response = await http.get(
      Uri.parse('$baseUrl/waybills/$id/pdf/'),
    );
    if (response.statusCode == 200) {
      return response;
    }
    throw Exception('Failed to download waybill PDF');
  }
}
