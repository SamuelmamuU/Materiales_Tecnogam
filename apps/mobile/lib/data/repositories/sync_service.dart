import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../sources/local_database.dart';

class SyncService {
  static final SyncService instance = SyncService._init();
  bool _isSyncing = false;

  SyncService._init();

  bool get isSyncing => _isSyncing;

  // Realiza la sincronización de todos los datos locales pendientes
  Future<Map<String, int>> syncPendingData() async {
    if (_isSyncing) return {'avances': 0, 'tiemposMuertos': 0, 'incidentes': 0};
    _isSyncing = true;

    final stats = {'avances': 0, 'tiemposMuertos': 0, 'incidentes': 0};
    final localDb = LocalDatabase.instance;
    final prefs = await SharedPreferences.getInstance();

    final accessToken = prefs.getString('accessToken') ?? '';
    if (accessToken.isEmpty) {
      _isSyncing = false;
      return stats;
    }

    try {
      // 1. Sincronizar Avances
      final pendingAvances = await localDb.getPendingAvances();
      for (final row in pendingAvances) {
        final success = await _uploadAvance(row, accessToken, prefs);
        if (success) {
          await localDb.deletePendingAvance(row['id']);
          stats['avances'] = stats['avances']! + 1;
        }
      }

      // 2. Sincronizar Tiempos Muertos
      final pendingTimes = await localDb.getPendingTiemposMuertos();
      for (final row in pendingTimes) {
        final success = await _uploadTiempoMuerto(row, accessToken, prefs);
        if (success) {
          await localDb.deletePendingTiempoMuerto(row['id']);
          stats['tiemposMuertos'] = stats['tiemposMuertos']! + 1;
        }
      }

      // 3. Sincronizar Incidentes
      final pendingIncidents = await localDb.getPendingIncidentes();
      for (final row in pendingIncidents) {
        final success = await _uploadIncidente(row, accessToken, prefs);
        if (success) {
          await localDb.deletePendingIncidente(row['id']);
          stats['incidentes'] = stats['incidentes']! + 1;
        }
      }

      // Registrar éxito en bitácora local
      final totalSynced = stats['avances']! + stats['tiemposMuertos']! + stats['incidentes']!;
      if (totalSynced > 0) {
        await localDb.insertSincronizacion({
          'id': DateTime.now().millisecondsSinceEpoch.toString(),
          'tipo': 'upload',
          'fecha': DateTime.now().toIso8601String(),
          'estatus': 'exito',
          'detalles': 'Sincronizados: ${stats['avances']} avances, ${stats['tiemposMuertos']} tiempos muertos, ${stats['incidentes']} incidentes.',
        });
      }

    } catch (e) {
      // Registrar error en bitácora local
      await localDb.insertSincronizacion({
        'id': DateTime.now().millisecondsSinceEpoch.toString(),
        'tipo': 'upload',
        'fecha': DateTime.now().toIso8601String(),
        'estatus': 'error',
        'detalles': 'Fallo de sincronización: ${e.toString()}',
      });
    } finally {
      _isSyncing = false;
    }

    return stats;
  }

  // Intenta refrescar el token de acceso JWT
  Future<String?> _refreshToken(SharedPreferences prefs) async {
    final refreshToken = prefs.getString('refreshToken') ?? '';
    if (refreshToken.isEmpty) return null;

    try {
      final url = Uri.parse('http://10.0.2.2:3000/auth/refresh');
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refreshToken}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await prefs.setString('accessToken', data['accessToken']);
        await prefs.setString('refreshToken', data['refreshToken']);
        return data['accessToken'];
      }
    } catch (_) {
      // Error de red en refresh
    }
    return null;
  }

  // Envía un avance individual al backend
  Future<bool> _uploadAvance(Map<String, dynamic> row, String token, SharedPreferences prefs, {bool retried = false}) async {
    try {
      final url = Uri.parse('http://10.0.2.2:3000/avances');
      final items = jsonDecode(row['items_json']);

      String? evidenceUrl = row['evidencia_url'];
      if (evidenceUrl != null && !evidenceUrl.startsWith('http')) {
        final uploadedUrl = await _uploadLocalFile(evidenceUrl, token);
        if (uploadedUrl != null) {
          evidenceUrl = uploadedUrl;
        } else {
          return false; // Abort if upload of critical local file fails
        }
      }

      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'id': row['id'],
          'proyectoId': row['proyecto_id'],
          'fecha': row['fecha'],
          'frente': row['frente'],
          'latitud': row['latitud'],
          'longitud': row['longitud'],
          'evidenciaUrl': evidenceUrl,
          'items': items,
        }),
      );

      if (response.statusCode == 401 && !retried) {
        // Intentar refrescar token y reintentar una vez
        final newToken = await _refreshToken(prefs);
        if (newToken != null) {
          return await _uploadAvance(row, newToken, prefs, retried: true);
        }
      }

      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      return false; // Error de red
    }
  }

  // Envía un tiempo muerto individual al backend
  Future<bool> _uploadTiempoMuerto(Map<String, dynamic> row, String token, SharedPreferences prefs, {bool retried = false}) async {
    try {
      final url = Uri.parse('http://10.0.2.2:3000/tiempos-muertos');
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'id': row['id'],
          'proyectoId': row['proyecto_id'],
          'frente': row['frente'],
          'causa': row['causa'],
          'duracion': row['duracion'],
          'fecha': row['fecha'],
        }),
      );

      if (response.statusCode == 401 && !retried) {
        final newToken = await _refreshToken(prefs);
        if (newToken != null) {
          return await _uploadTiempoMuerto(row, newToken, prefs, retried: true);
        }
      }

      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  // Envía un incidente individual al backend
  Future<bool> _uploadIncidente(Map<String, dynamic> row, String token, SharedPreferences prefs, {bool retried = false}) async {
    try {
      final url = Uri.parse('http://10.0.2.2:3000/incidentes');

      String? evidenceUrl = row['evidencia_url'];
      if (evidenceUrl != null && !evidenceUrl.startsWith('http')) {
        final uploadedUrl = await _uploadLocalFile(evidenceUrl, token);
        if (uploadedUrl != null) {
          evidenceUrl = uploadedUrl;
        } else {
          return false;
        }
      }

      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'id': row['id'],
          'proyectoId': row['proyecto_id'],
          'categoria': row['categoria'],
          'descripcion': row['descripcion'],
          'fecha': row['fecha'],
          'latitud': row['latitud'],
          'longitud': row['longitud'],
          'evidenciaUrl': evidenceUrl,
        }),
      );

      if (response.statusCode == 401 && !retried) {
        final newToken = await _refreshToken(prefs);
        if (newToken != null) {
          return await _uploadIncidente(row, newToken, prefs, retried: true);
        }
      }

      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  // Sube un archivo local al backend /media/upload y obtiene su URL final de MinIO
  Future<String?> _uploadLocalFile(String filePath, String token) async {
    final file = File(filePath);
    if (!await file.exists()) {
      return null;
    }

    try {
      final url = Uri.parse('http://10.0.2.2:3000/media/upload');
      final request = http.MultipartRequest('POST', url);
      request.headers['Authorization'] = 'Bearer $token';

      final multipartFile = await http.MultipartFile.fromPath(
        'file',
        filePath,
      );
      request.files.add(multipartFile);

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return data['url'] as String?;
      }
    } catch (_) {
      // Error al subir archivo
    }
    return null;
  }
}
