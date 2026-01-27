import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // Base URL for Django backend - update this with your actual backend URL
  static const String baseUrl = 'http://localhost:8765';
  static const Duration timeout = Duration(seconds: 30);

  // ============================================================================
  // INVOICE APIs
  // ============================================================================

  /// Calculate invoice preview totals without saving
  static Future<Map<String, dynamic>> calculateInvoicePreview(Map<String, dynamic> data) async {
    final response = await http
        .post(
          Uri.parse('$baseUrl/invoices/api/calculate-preview/'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(data),
        )
        .timeout(timeout);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to calculate invoice preview: ${response.body}');
  }

  /// Create a new invoice
  static Future<Map<String, dynamic>> createInvoice(Map<String, dynamic> data) async {
    final response = await http
        .post(
          Uri.parse('$baseUrl/invoices/api/create/'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(data),
        )
        .timeout(timeout);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to create invoice: ${response.body}');
  }

  /// Get invoice by ID
  static Future<Map<String, dynamic>> getInvoice(int id) async {
    final response = await http
        .get(Uri.parse('$baseUrl/invoices/api/$id/'))
        .timeout(timeout);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to get invoice: ${response.statusCode}');
  }

  /// Update an existing invoice
  static Future<Map<String, dynamic>> updateInvoice(int id, Map<String, dynamic> data) async {
    final response = await http
        .put(
          Uri.parse('$baseUrl/invoices/api/$id/'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(data),
        )
        .timeout(timeout);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to update invoice: ${response.body}');
  }

  /// Download invoice PDF
  static Future<http.Response> downloadInvoicePDF(int id) async {
    final response = await http
        .get(Uri.parse('$baseUrl/invoices/$id/pdf/'))
        .timeout(timeout);
    if (response.statusCode == 200) {
      return response;
    }
    throw Exception('Failed to download invoice PDF: ${response.statusCode}');
  }

  /// Get invoice configuration (tax settings)
  static Future<Map<String, dynamic>> getInvoiceConfig() async {
    final response = await http
        .get(Uri.parse('$baseUrl/invoices/api/config/'))
        .timeout(timeout);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to get invoice config: ${response.statusCode}');
  }

  /// Get invoice configuration (tax settings)
  static Future<Map<String, dynamic>> getInvoiceConfig() async {
    final response = await http
        .get(Uri.parse('$baseUrl/invoices/api/config/'))
        .timeout(timeout);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to get invoice config: ${response.statusCode}');
  }

  // ============================================================================
  // RECEIPT APIs
  // ============================================================================

  /// Create a new receipt
  static Future<Map<String, dynamic>> createReceipt(Map<String, dynamic> data) async {
    final response = await http
        .post(
          Uri.parse('$baseUrl/receipts/api/create/'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(data),
        )
        .timeout(timeout);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to create receipt: ${response.body}');
  }

  /// Get receipt by ID
  static Future<Map<String, dynamic>> getReceipt(int id) async {
    final response = await http
        .get(Uri.parse('$baseUrl/receipts/api/$id/'))
        .timeout(timeout);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to get receipt: ${response.statusCode}');
  }

  /// Update an existing receipt
  static Future<Map<String, dynamic>> updateReceipt(int id, Map<String, dynamic> data) async {
    final response = await http
        .put(
          Uri.parse('$baseUrl/receipts/api/$id/'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(data),
        )
        .timeout(timeout);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to update receipt: ${response.body}');
  }

  /// Download receipt PDF
  static Future<http.Response> downloadReceiptPDF(int id) async {
    final response = await http
        .get(Uri.parse('$baseUrl/receipts/$id/pdf/'))
        .timeout(timeout);
    if (response.statusCode == 200) {
      return response;
    }
    throw Exception('Failed to download receipt PDF: ${response.statusCode}');
  }

  /// Download receipt PDF
  static Future<http.Response> downloadReceiptPDF(int id) async {
    final response = await http
        .get(Uri.parse('$baseUrl/receipts/$id/pdf/'))
        .timeout(timeout);
    if (response.statusCode == 200) {
      return response;
    }
    throw Exception('Failed to download receipt PDF: ${response.statusCode}');
  }

  // ============================================================================
  // WAYBILL APIs
  // ============================================================================

  /// Create a new waybill
  static Future<Map<String, dynamic>> createWaybill(Map<String, dynamic> data) async {
    final response = await http
        .post(
          Uri.parse('$baseUrl/waybills/api/create/'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(data),
        )
        .timeout(timeout);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to create waybill: ${response.body}');
  }

  /// Get waybill by ID
  static Future<Map<String, dynamic>> getWaybill(int id) async {
    final response = await http
        .get(Uri.parse('$baseUrl/waybills/api/$id/'))
        .timeout(timeout);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to get waybill: ${response.statusCode}');
  }

  /// Update an existing waybill
  static Future<Map<String, dynamic>> updateWaybill(int id, Map<String, dynamic> data) async {
    final response = await http
        .put(
          Uri.parse('$baseUrl/waybills/api/$id/'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(data),
        )
        .timeout(timeout);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to update waybill: ${response.body}');
  }

  /// Download waybill PDF
  static Future<http.Response> downloadWaybillPDF(int id) async {
    final response = await http
        .get(Uri.parse('$baseUrl/waybills/$id/pdf/'))
        .timeout(timeout);
    if (response.statusCode == 200) {
      return response;
    }
    throw Exception('Failed to download waybill PDF: ${response.statusCode}');
  }

  // ============================================================================
  // COUNTER APIs (Document Numbering)
  // ============================================================================

  /// Get next invoice number (POST to increment, GET for preview)
  static Future<String> getNextInvoiceNumber({bool increment = false}) async {
    final uri = Uri.parse('$baseUrl/api/counter/invoice/next/');
    final response = increment
        ? await http.post(uri).timeout(timeout)
        : await http.get(uri).timeout(timeout);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      return data['next_number'];
    }
    throw Exception('Failed to get next invoice number: ${response.statusCode}');
  }

  /// Get next receipt number (POST to increment, GET for preview)
  static Future<String> getNextReceiptNumber({bool increment = false}) async {
    final uri = Uri.parse('$baseUrl/api/counter/receipt/next/');
    final response = increment
        ? await http.post(uri).timeout(timeout)
        : await http.get(uri).timeout(timeout);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      return data['next_number'];
    }
    throw Exception('Failed to get next receipt number: ${response.statusCode}');
  }

  /// Get next waybill number (POST to increment, GET for preview)
  static Future<String> getNextWaybillNumber({bool increment = false}) async {
    final uri = Uri.parse('$baseUrl/api/counter/waybill/next/');
    final response = increment
        ? await http.post(uri).timeout(timeout)
        : await http.get(uri).timeout(timeout);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      return data['next_number'];
    }
    throw Exception('Failed to get next waybill number: ${response.statusCode}');
  }

  /// Get current document counts for all document types
  static Future<Map<String, dynamic>> getDocumentCounts() async {
    final response = await http
        .get(Uri.parse('$baseUrl/api/counter/counts/'))
        .timeout(timeout);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to get document counts: ${response.statusCode}');
  }

  // ============================================================================
  // PROJECT APIs (Export/Import)
  // ============================================================================

  /// Export entire project as archive
  static Future<http.Response> exportProject() async {
    final response = await http
        .post(Uri.parse('$baseUrl/api/project/export/'))
        .timeout(timeout);
    if (response.statusCode == 200) {
      return response;
    }
    throw Exception('Failed to export project: ${response.statusCode}');
  }

  /// Import project from archive
  static Future<Map<String, dynamic>> importProject(List<int> archiveBytes) async {
    final request = http.MultipartRequest(
      'POST',
      Uri.parse('$baseUrl/api/project/import/'),
    );
    request.files.add(
      http.MultipartFile.fromBytes(
        'file',
        archiveBytes,
        filename: 'project.billproj',
      ),
    );
    final streamedResponse = await request.send().timeout(timeout);
    final response = await http.Response.fromStream(streamedResponse);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to import project: ${response.body}');
  }
}
