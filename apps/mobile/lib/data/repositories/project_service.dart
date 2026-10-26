import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../sources/api_service.dart';

class ProjectItem {
  final String id;
  final String nombre;
  final String cliente;
  final String? logoCliente;
  final String? liderCliente;
  final String? telefonoLiderCliente;
  final String? liderTecnogam;

  ProjectItem({
    required this.id,
    required this.nombre,
    required this.cliente,
    this.logoCliente,
    this.liderCliente,
    this.telefonoLiderCliente,
    this.liderTecnogam,
  });

  factory ProjectItem.fromJson(Map<String, dynamic> json) {
    return ProjectItem(
      id: json['id'] ?? '',
      nombre: json['nombre'] ?? 'Sin Nombre',
      cliente: json['cliente'] ?? 'Sin Cliente',
      logoCliente: json['logoCliente'],
      liderCliente: json['liderCliente'],
      telefonoLiderCliente: json['telefonoLiderCliente'],
      liderTecnogam: json['liderTecnogam'],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'nombre': nombre,
    'cliente': cliente,
    'logoCliente': logoCliente,
    'liderCliente': liderCliente,
    'telefonoLiderCliente': telefonoLiderCliente,
    'liderTecnogam': liderTecnogam,
  };
}

class ProjectService {
  static final ProjectService instance = ProjectService._init();
  ProjectService._init();

  Future<List<ProjectItem>> getProjects() async {
    final prefs = await SharedPreferences.getInstance();
    try {
      final res = await ApiService.instance.get('/projects');
      if (res.success && res.data is List) {
        final list = (res.data as List)
            .map((item) => ProjectItem.fromJson(Map<String, dynamic>.from(item)))
            .toList();
        if (list.isNotEmpty) {
          final encoded = jsonEncode(list.map((p) => p.toJson()).toList());
          await prefs.setString('cache_projects_list', encoded);
          return list;
        }
      }
    } catch (_) {}

    // Fallback de caché
    final cached = prefs.getString('cache_projects_list');
    if (cached != null) {
      try {
        final List decoded = jsonDecode(cached);
        return decoded
            .map((item) => ProjectItem.fromJson(Map<String, dynamic>.from(item)))
            .toList();
      } catch (_) {}
    }

    return [
      ProjectItem(
        id: 'e5911ce8-c7ff-44f6-9f6a-48472f25e77f',
        nombre: 'Control Tecnogam Industrial',
        cliente: 'Tecnogam Operaciones',
      ),
    ];
  }

  Future<Map<String, dynamic>?> getProjectDashboard(String projectId) async {
    final prefs = await SharedPreferences.getInstance();
    try {
      final res = await ApiService.instance.get('/projects/$projectId/dashboard');
      if (res.success && res.data is Map<String, dynamic>) {
        final map = Map<String, dynamic>.from(res.data);
        await prefs.setString('cache_dashboard_$projectId', jsonEncode(map));
        return map;
      }
    } catch (_) {}

    final cached = prefs.getString('cache_dashboard_$projectId');
    if (cached != null) {
      try {
        return Map<String, dynamic>.from(jsonDecode(cached));
      } catch (_) {}
    }

    return null;
  }

  Future<List<Map<String, dynamic>>> getMaterialsCatalog([String query = '']) async {
    final prefs = await SharedPreferences.getInstance();
    try {
      final endpoint = query.isNotEmpty ? '/materials?q=$query' : '/materials';
      final res = await ApiService.instance.get(endpoint);
      if (res.success && res.data is List) {
        final list = List<Map<String, dynamic>>.from(
          res.data.map((item) => Map<String, dynamic>.from(item)),
        );
        if (list.isNotEmpty && query.isEmpty) {
          await prefs.setString('cache_materials_catalog', jsonEncode(list));
        }
        return list;
      }
    } catch (_) {}

    final cached = prefs.getString('cache_materials_catalog');
    if (cached != null) {
      try {
        final List decoded = jsonDecode(cached);
        final list = List<Map<String, dynamic>>.from(
          decoded.map((item) => Map<String, dynamic>.from(item)),
        );
        if (query.isEmpty) return list;
        final q = query.toLowerCase();
        return list.where((m) {
          final cod = (m['codigo'] ?? '').toString().toLowerCase();
          final desc = (m['descripcion'] ?? '').toString().toLowerCase();
          return cod.contains(q) || desc.contains(q);
        }).toList();
      } catch (_) {}
    }

    // Materiales de contingencia básica offline
    return [
      {'id': 'DG-1200', 'codigo': 'DG-1200', 'descripcion': 'Ducto galvanizado 12"', 'unidad': 'tramo'},
      {'id': 'AT-0450', 'codigo': 'AT-0450', 'descripcion': 'Aislamiento térmico 2"', 'unidad': 'rollo'},
      {'id': 'VL-2210', 'codigo': 'VL-2210', 'descripcion': 'Válvula de compuerta 4"', 'unidad': 'pza'},
      {'id': 'TUB-01', 'codigo': 'TUB-01', 'descripcion': 'Tubería conduit pesada 3/4"', 'unidad': 'tramo'},
      {'id': 'CAB-10', 'codigo': 'CAB-10', 'descripcion': 'Cable de cobre THW Calibre 10', 'unidad': 'm'},
    ];
  }
}
