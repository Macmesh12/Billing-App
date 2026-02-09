import 'dart:convert';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'dart:io';

class LocalDb {
  static final LocalDb _instance = LocalDb._internal();
  factory LocalDb() => _instance;
  LocalDb._internal();

  Database? _db;

  Future<Database> get db async {
    if (_db != null) return _db!;
    _db = await _init();
    return _db!;
  }

  Future<Database> _init() async {
    // Enable FFI for desktop (Windows/Linux/macOS)
    if (!Platform.isAndroid && !Platform.isIOS) {
      sqfliteFfiInit();
      databaseFactory = databaseFactoryFfi;
    }

    final docs = await getApplicationDocumentsDirectory();
    final path = join(docs.path, 'billdoc_local.db');
    return await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE invoices (
            id TEXT PRIMARY KEY,
            json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          );
        ''');
        await db.execute('''
          CREATE TABLE receipts (
            id TEXT PRIMARY KEY,
            json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          );
        ''');
        await db.execute('''
          CREATE TABLE waybills (
            id TEXT PRIMARY KEY,
            json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          );
        ''');
      },
    );
  }

  Future<void> insert(String table, String id, Map<String,dynamic> jsonObj) async {
    final database = await db;
    final now = DateTime.now().millisecondsSinceEpoch;
    await database.insert(table, {
      'id': id,
      'json': jsonEncode(jsonObj),
      'created_at': now,
      'updated_at': now,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<void> update(String table, String id, Map<String,dynamic> jsonObj) async {
    final database = await db;
    final now = DateTime.now().millisecondsSinceEpoch;
    await database.update(
      table,
      {
        'json': jsonEncode(jsonObj),
        'updated_at': now,
      },
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<Map<String,dynamic>?> getById(String table, String id) async {
    final database = await db;
    final rows = await database.query(table, where: 'id = ?', whereArgs: [id]);
    if (rows.isEmpty) return null;
    return jsonDecode(rows.first['json'] as String) as Map<String,dynamic>;
  }

  Future<List<Map<String,dynamic>>> getAll(String table) async {
    final database = await db;
    final rows = await database.query(table, orderBy: 'updated_at DESC');
    return rows.map((r) {
      final jsonObj = jsonDecode(r['json'] as String) as Map<String,dynamic>;
      jsonObj['_id'] = r['id'];
      jsonObj['_created_at'] = r['created_at'];
      jsonObj['_updated_at'] = r['updated_at'];
      return jsonObj;
    }).toList();
  }

  Future<void> delete(String table, String id) async {
    final database = await db;
    await database.delete(table, where: 'id = ?', whereArgs: [id]);
  }

  Future<String> exportAllAsJson(String table) async {
    final all = await getAll(table);
    return jsonEncode(all);
  }

  Future<void> importFromJson(String table, String payload) async {
    final decoded = jsonDecode(payload);
    if (decoded is! List) return;
    for (final item in decoded) {
      if (item is Map<String,dynamic>) {
        final id = item['_id']?.toString() ?? item['invoiceNumber']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString();
        await insert(table, id, item);
      }
    }
  }
}
