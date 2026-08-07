import 'dart:async';
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';

class LocalDatabase {
  static final LocalDatabase instance = LocalDatabase._init();
  static Database? _database;

  LocalDatabase._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('tecnogam_offline.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future _createDB(Database db, int version) async {
    // Tabla de Avances Pendientes de Sincronización
    await db.execute('''
      CREATE TABLE avances_pendientes (
        id TEXT PRIMARY KEY,
        proyecto_id TEXT NOT NULL,
        fecha TEXT NOT NULL,
        frente TEXT NOT NULL,
        latitud REAL,
        longitud REAL,
        evidencia_url TEXT,
        items_json TEXT NOT NULL
      )
    ''');

    // Tabla de Tiempos Muertos Pendientes de Sincronización
    await db.execute('''
      CREATE TABLE tiempos_muertos_pendientes (
        id TEXT PRIMARY KEY,
        proyecto_id TEXT NOT NULL,
        frente TEXT NOT NULL,
        causa TEXT NOT NULL,
        duracion REAL NOT NULL,
        fecha TEXT NOT NULL
      )
    ''');

    // Tabla de Incidentes Pendientes de Sincronización
    await db.execute('''
      CREATE TABLE incidentes_pendientes (
        id TEXT PRIMARY KEY,
        proyecto_id TEXT NOT NULL,
        categoria TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        fecha TEXT NOT NULL,
        latitud REAL,
        longitud REAL,
        evidencia_url TEXT
      )
    ''');

    // Tabla de Bitácora de Sincronización Local
    await db.execute('''
      CREATE TABLE bitacora_sincronizaciones (
        id TEXT PRIMARY KEY,
        tipo TEXT NOT NULL,
        fecha TEXT NOT NULL,
        estatus TEXT NOT NULL,
        detalles TEXT
      )
    ''');
  }

  // --- CRUD para Avances ---
  Future<int> insertAvance(Map<String, dynamic> row) async {
    final db = await instance.database;
    return await db.insert('avances_pendientes', row, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Map<String, dynamic>>> getPendingAvances() async {
    final db = await instance.database;
    return await db.query('avances_pendientes');
  }

  Future<int> deletePendingAvance(String id) async {
    final db = await instance.database;
    return await db.delete('avances_pendientes', where: 'id = ?', whereArgs: [id]);
  }

  // --- CRUD para Tiempos Muertos ---
  Future<int> insertTiempoMuerto(Map<String, dynamic> row) async {
    final db = await instance.database;
    return await db.insert('tiempos_muertos_pendientes', row, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Map<String, dynamic>>> getPendingTiemposMuertos() async {
    final db = await instance.database;
    return await db.query('tiempos_muertos_pendientes');
  }

  Future<int> deletePendingTiempoMuerto(String id) async {
    final db = await instance.database;
    return await db.delete('tiempos_muertos_pendientes', where: 'id = ?', whereArgs: [id]);
  }

  // --- CRUD para Incidentes ---
  Future<int> insertIncidente(Map<String, dynamic> row) async {
    final db = await instance.database;
    return await db.insert('incidentes_pendientes', row, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Map<String, dynamic>>> getPendingIncidentes() async {
    final db = await instance.database;
    return await db.query('incidentes_pendientes');
  }

  Future<int> deletePendingIncidente(String id) async {
    final db = await instance.database;
    return await db.delete('incidentes_pendientes', where: 'id = ?', whereArgs: [id]);
  }

  // --- CRUD para Bitácora ---
  Future<int> insertSincronizacion(Map<String, dynamic> row) async {
    final db = await instance.database;
    return await db.insert('bitacora_sincronizaciones', row, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Map<String, dynamic>>> getSincronizaciones() async {
    final db = await instance.database;
    return await db.query('bitacora_sincronizaciones', orderBy: 'fecha DESC');
  }

  Future<void> close() async {
    final db = await instance.database;
    db.close();
  }
}
