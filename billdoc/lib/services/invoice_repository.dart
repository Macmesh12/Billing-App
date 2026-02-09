import 'package:uuid/uuid.dart';
import '../models/invoice.dart';
import 'local_db.dart';

class InvoiceRecord {
  final String id;
  final Invoice invoice;
  final bool isDraft;

  const InvoiceRecord({required this.id, required this.invoice, required this.isDraft});
}

class InvoiceRepository {
  final LocalDb _db = LocalDb();
  final Uuid _uuid = Uuid();
  static const String table = 'invoices';

  Future<String> saveInvoice(Invoice invoice, {bool isDraft = true}) async {
    final id = invoice.invoiceNumber.isNotEmpty ? invoice.invoiceNumber : _uuid.v4();
    final json = Map<String, dynamic>.from(invoice.toJson())..['isDraft'] = isDraft;
    await _db.insert(table, id, json);
    return id;
  }

  Future<void> updateInvoice(String id, Invoice invoice, {bool isDraft = true}) async {
    final json = Map<String, dynamic>.from(invoice.toJson())..['isDraft'] = isDraft;
    await _db.update(table, id, json);
  }

  Future<InvoiceRecord?> getInvoiceById(String id) async {
    final json = await _db.getById(table, id);
    if (json == null) return null;
    return _toRecord(id, json);
  }

  Future<List<InvoiceRecord>> getDraftInvoices() async {
    final all = await _db.getAll(table);
    return all
        .where((j) => (j['isDraft'] as bool?) ?? true)
        .mapIndexed((idx, j) => _toRecord(j['_id']?.toString() ?? idx.toString(), j))
        .toList();
  }

  Future<List<InvoiceRecord>> getFinalizedInvoices() async {
    final all = await _db.getAll(table);
    return all
        .where((j) => !((j['isDraft'] as bool?) ?? true))
        .mapIndexed((idx, j) => _toRecord(j['_id']?.toString() ?? idx.toString(), j))
        .toList();
  }

  Future<void> deleteInvoice(String id) async {
    await _db.delete(table, id);
  }

  Future<String> exportAll() async => await _db.exportAllAsJson(table);
  Future<void> importFromJson(String payload) async => await _db.importFromJson(table, payload);

  InvoiceRecord _toRecord(String id, Map<String, dynamic> j) {
    final items = <InvoiceItem>[];
    final rawItems = (j['items'] as List<dynamic>?) ?? [];
    for (final it in rawItems) {
      if (it is Map<String, dynamic>) {
        items.add(InvoiceItem(
          description: it['description']?.toString() ?? '',
          quantity: (it['qty'] is int)
              ? it['qty'] as int
              : (it['qty'] is num)
                  ? (it['qty'] as num).toInt()
                  : (it['quantity'] is num)
                      ? (it['quantity'] as num).toInt()
                      : 0,
          unitPrice: (it['unit_price'] is num)
              ? (it['unit_price'] as num).toDouble()
              : (double.tryParse(it['unit_price']?.toString() ?? '0') ?? 0.0),
          discount: (it['discount'] is num) ? (it['discount'] as num).toDouble() : 0.0,
        ));
      }
    }

    final invoice = Invoice(
      invoiceNumber: j['invoiceNumber']?.toString() ?? '',
      date: j['date']?.toString() ?? '',
      dueDate: j['dueDate']?.toString() ?? '',
      customerName: j['customerName']?.toString() ?? '',
      issuer: j['issuer']?.toString() ?? '',
      items: items,
      subtotalOverride: (j['subtotal'] is num) ? (j['subtotal'] as num).toDouble() : null,
      grandTotalOverride: (j['grandTotal'] is num) ? (j['grandTotal'] as num).toDouble() : null,
    );

    final isDraft = (j['isDraft'] as bool?) ?? true;

    return InvoiceRecord(id: id, invoice: invoice, isDraft: isDraft);
  }
}

extension _MapIndexed<E> on Iterable<E> {
  Iterable<T> mapIndexed<T>(T Function(int index, E element) f) sync* {
    var i = 0;
    for (final e in this) {
      yield f(i, e);
      i++;
    }
  }
}
