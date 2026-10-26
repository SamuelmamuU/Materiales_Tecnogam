import 'dart:convert';
import 'package:flutter/material.dart';
import '../../data/repositories/project_service.dart';
import '../../data/sources/api_config.dart';
import '../../data/sources/local_database.dart';
import '../../data/sources/location_service.dart';
import '../../data/repositories/sync_service.dart';
import '../widgets/project_header_banner.dart';
import 'camera_capture_screen.dart';

class AvanceItemData {
  final String tipo; // 'planeado' | 'no_planeado'
  final double cantidad;
  final String? materialId;
  final String? codigo;
  final String? descripcion;
  final String? unidad;
  final String? subtipo; // 'retrabajo' | 'extra' | 'modificacion'
  final String? materialManual;

  AvanceItemData({
    required this.tipo,
    required this.cantidad,
    this.materialId,
    this.codigo,
    this.descripcion,
    this.unidad,
    this.subtipo,
    this.materialManual,
  });

  Map<String, dynamic> toJson() {
    return {
      'tipo': tipo,
      'cantidad': cantidad,
      if (tipo == 'planeado') 'materialId': materialId,
      if (tipo == 'planeado' && codigo != null) 'codigo': codigo,
      if (tipo == 'no_planeado') ...{
        'subtipo': subtipo ?? 'retrabajo',
        'materialManual': materialManual ?? '',
      },
    };
  }
}

class CaptureAvanceScreen extends StatefulWidget {
  final String? projectId;

  const CaptureAvanceScreen({super.key, this.projectId});

  @override
  State<CaptureAvanceScreen> createState() => _CaptureAvanceScreenState();
}

class _CaptureAvanceScreenState extends State<CaptureAvanceScreen> {
  final _formKey = GlobalKey<FormState>();
  final _frenteController = TextEditingController();
  final _fechaController = TextEditingController();

  // Apartado A: Planeado
  final _searchController = TextEditingController();
  final _cantidadPlaneadoController = TextEditingController();
  Map<String, dynamic>? _selectedPlaneadoMaterial;

  // Apartado B: No Planeado
  final _cantidadNoPlaneadoController = TextEditingController();
  final _materialManualController = TextEditingController();
  String _selectedSubtipo = 'retrabajo'; // retrabajo | extra | modificacion

  // Lista de items acumulados
  final List<AvanceItemData> _itemsList = [];

  // Datos del entorno
  late String _activeProjectId;
  List<Map<String, dynamic>> _bomMaterials = [];
  List<Map<String, dynamic>> _catalogMaterials = [];
  bool _loadingMaterials = true;

  double? _latitud;
  double? _longitud;
  String? _evidenciaUrl;
  bool _obtainingGps = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _activeProjectId = widget.projectId ?? ApiConfig.defaultProjectId;
    _fechaController.text = DateTime.now().toIso8601String().substring(0, 10);
    _initProjectAndMaterials();
  }

  @override
  void dispose() {
    _frenteController.dispose();
    _fechaController.dispose();
    _searchController.dispose();
    _cantidadPlaneadoController.dispose();
    _cantidadNoPlaneadoController.dispose();
    _materialManualController.dispose();
    super.dispose();
  }

  Future<void> _initProjectAndMaterials() async {
    final pid = widget.projectId ?? await ApiConfig.instance.getActiveProjectId();
    if (mounted) {
      setState(() {
        _activeProjectId = pid ?? ApiConfig.defaultProjectId;
      });
      await _loadMaterials();
    }
  }

  Future<void> _loadMaterials() async {
    setState(() => _loadingMaterials = true);
    try {
      // 1. Cargar BOM del proyecto
      final dashboard = await ProjectService.instance.getProjectDashboard(_activeProjectId);
      List<Map<String, dynamic>> bom = [];
      if (dashboard != null && dashboard['reconciliation'] is List) {
        bom = List<Map<String, dynamic>>.from(
          (dashboard['reconciliation'] as List).map((m) => {
            'materialId': m['materialId'] ?? m['id'] ?? '',
            'codigo': m['codigo'] ?? '',
            'descripcion': m['descripcion'] ?? '',
            'unidad': m['unidad'] ?? 'pza',
          }),
        );
      }

      // 2. Cargar catálogo maestro general
      final general = await ProjectService.instance.getMaterialsCatalog();

      if (mounted) {
        setState(() {
          _bomMaterials = bom;
          _catalogMaterials = general;
        });
      }
    } catch (_) {
      // Errores silenciados
    } finally {
      if (mounted) setState(() => _loadingMaterials = false);
    }
  }

  Future<void> _obtenerGps() async {
    setState(() => _obtainingGps = true);
    try {
      final pos = await LocationService.getCurrentLocation();
      if (pos != null && mounted) {
        setState(() {
          _latitud = pos.latitude;
          _longitud = pos.longitude;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ubicación GPS obtenida con éxito')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error GPS: $e'), backgroundColor: Colors.redAccent),
        );
      }
    } finally {
      if (mounted) setState(() => _obtainingGps = false);
    }
  }

  Future<void> _tomarFoto() async {
    final resultPath = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const CameraCaptureScreen()),
    );
    if (resultPath != null && mounted) {
      setState(() {
        _evidenciaUrl = resultPath;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Evidencia fotográfica capturada')),
      );
    }
  }

  void _addPlaneadoItem() {
    if (_selectedPlaneadoMaterial == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Seleccione un material del catálogo primero.')),
      );
      return;
    }
    final qty = double.tryParse(_cantidadPlaneadoController.text.trim());
    if (qty == null || qty <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ingrese una cantidad válida mayor a cero.')),
      );
      return;
    }

    final mat = _selectedPlaneadoMaterial!;
    final matId = mat['materialId'] ?? mat['id'] ?? mat['codigo'] ?? '';
    final cod = mat['codigo'] ?? '';
    final desc = mat['descripcion'] ?? '';
    final unid = mat['unidad'] ?? 'pza';

    setState(() {
      _itemsList.add(
        AvanceItemData(
          tipo: 'planeado',
          cantidad: qty,
          materialId: matId,
          codigo: cod,
          descripcion: desc,
          unidad: unid,
        ),
      );
      _selectedPlaneadoMaterial = null;
      _searchController.clear();
      _cantidadPlaneadoController.clear();
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Material planeado ($cod) agregado al reporte.'),
        duration: const Duration(seconds: 1),
      ),
    );
  }

  void _addNoPlaneadoItem() {
    final desc = _materialManualController.text.trim();
    if (desc.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Escriba la descripción del material no planeado.')),
      );
      return;
    }
    final qty = double.tryParse(_cantidadNoPlaneadoController.text.trim());
    if (qty == null || qty <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ingrese una cantidad válida mayor a cero.')),
      );
      return;
    }

    setState(() {
      _itemsList.add(
        AvanceItemData(
          tipo: 'no_planeado',
          cantidad: qty,
          subtipo: _selectedSubtipo,
          materialManual: desc,
          descripcion: desc,
        ),
      );
      _materialManualController.clear();
      _cantidadNoPlaneadoController.clear();
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Avance no planeado agregado al reporte.'),
        duration: Duration(seconds: 1),
      ),
    );
  }

  void _removeItem(int index) {
    setState(() {
      _itemsList.removeAt(index);
    });
  }

  Future<void> _guardarReporteCompleto() async {
    if (!_formKey.currentState!.validate()) return;

    if (_itemsList.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Debe agregar al menos un material (Planeado o No Planeado) a la lista.'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    setState(() => _saving = true);

    final frente = _frenteController.text.trim();
    final fecha = _fechaController.text.trim();
    final uuid = DateTime.now().microsecondsSinceEpoch.toString();

    final itemsJson = jsonEncode(_itemsList.map((it) => it.toJson()).toList());

    final pendingAvance = {
      'id': 'av-$uuid',
      'proyecto_id': _activeProjectId,
      'fecha': fecha.isNotEmpty ? '${fecha}T12:00:00.000Z' : DateTime.now().toIso8601String(),
      'frente': frente,
      'latitud': _latitud,
      'longitud': _longitud,
      'evidencia_url': _evidenciaUrl,
      'items_json': itemsJson,
    };

    try {
      await LocalDatabase.instance.insertAvance(pendingAvance);

      // Sincronizar en segundo plano si hay red
      SyncService.instance.syncPendingData().ignore();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('¡Reporte de avance guardado con éxito (${_itemsList.length} items)!'),
            backgroundColor: const Color(0xFF27500A),
          ),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al guardar: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showMaterialPickerBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        String filterQuery = '';
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final query = filterQuery.toLowerCase().trim();

            final filteredBom = _bomMaterials.where((m) {
              if (query.isEmpty) return true;
              final cod = (m['codigo'] ?? '').toString().toLowerCase();
              final desc = (m['descripcion'] ?? '').toString().toLowerCase();
              return cod.contains(query) || desc.contains(query);
            }).toList();

            final filteredCatalog = _catalogMaterials.where((m) {
              final cod = (m['codigo'] ?? '').toString().toLowerCase();
              final desc = (m['descripcion'] ?? '').toString().toLowerCase();
              // Excluir si ya está en BOM
              final inBom = _bomMaterials.any((b) => b['codigo'] == m['codigo']);
              if (inBom) return false;
              if (query.isEmpty) return true;
              return cod.contains(query) || desc.contains(query);
            }).toList();

            return Container(
              height: MediaQuery.of(context).size.height * 0.75,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Seleccionar Material del Catálogo',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.of(ctx).pop(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    autofocus: true,
                    decoration: InputDecoration(
                      hintText: 'Buscar por código o descripción...',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      filled: true,
                      fillColor: const Color(0xFFF7F7F5),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: Color(0xFFC9C7BD)),
                      ),
                    ),
                    onChanged: (val) {
                      setSheetState(() {
                        filterQuery = val;
                      });
                    },
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: ListView(
                      children: [
                        if (filteredBom.isNotEmpty) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            color: const Color(0xFFE6F1FB),
                            child: const Text(
                              'MATERIALES DEL PROYECTO (BOM)',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF0C447C),
                              ),
                            ),
                          ),
                          ...filteredBom.map((m) => ListTile(
                                dense: true,
                                title: Text(
                                  m['codigo'] ?? '',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                                subtitle: Text(
                                  '${m['descripcion']} (${m['unidad'] ?? 'pza'})',
                                  style: const TextStyle(fontSize: 11, color: Color(0xFF5F5E5A)),
                                ),
                                trailing: const Icon(Icons.add_circle_outline, color: Color(0xFF0C447C), size: 20),
                                onTap: () {
                                  setState(() {
                                    _selectedPlaneadoMaterial = m;
                                    _searchController.text = '${m['codigo']} - ${m['descripcion']}';
                                  });
                                  Navigator.of(ctx).pop();
                                },
                              )),
                        ],
                        if (filteredCatalog.isNotEmpty) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            margin: const EdgeInsets.only(top: 8),
                            color: const Color(0xFFFCF4E6),
                            child: const Text(
                              'OTROS MATERIALES DEL CATÁLOGO MAESTRO',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFFBA7517),
                              ),
                            ),
                          ),
                          ...filteredCatalog.map((m) => ListTile(
                                dense: true,
                                title: Text(
                                  m['codigo'] ?? '',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                                subtitle: Text(
                                  '${m['descripcion']} (${m['unidad'] ?? 'pza'})',
                                  style: const TextStyle(fontSize: 11, color: Color(0xFF5F5E5A)),
                                ),
                                trailing: const Icon(Icons.add_circle_outline, color: Color(0xFFBA7517), size: 20),
                                onTap: () {
                                  setState(() {
                                    _selectedPlaneadoMaterial = m;
                                    _searchController.text = '${m['codigo']} - ${m['descripcion']}';
                                  });
                                  Navigator.of(ctx).pop();
                                },
                              )),
                        ],
                        if (filteredBom.isEmpty && filteredCatalog.isEmpty)
                          const Padding(
                            padding: EdgeInsets.all(24.0),
                            child: Center(
                              child: Text(
                                'No se encontraron materiales que coincidan.',
                                style: TextStyle(color: Color(0xFF8B8A84), fontSize: 12),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    const surface0 = Color(0xFFF7F7F5);
    const surface1 = Color(0xFFF1EFE8);
    const textPrimary = Color(0xFF1C1C1A);
    const textSecondary = Color(0xFF5F5E5A);
    const fillPrimary = Color(0xFF1C1C1A);

    return Scaffold(
      backgroundColor: surface0,
      appBar: AppBar(
        backgroundColor: surface1,
        title: const Text(
          'Bitácora Diaria de Avances',
          style: TextStyle(color: textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(14.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Banner de Proyecto Activo con Logos Tecnogam y Cliente
              ProjectHeaderBanner(
                compact: true,
                onProjectChanged: (project) {
                  setState(() {
                    _activeProjectId = project.id;
                    _selectedPlaneadoMaterial = null;
                    _searchController.clear();
                    _itemsList.clear();
                  });
                  _loadMaterials();
                },
              ),
              const SizedBox(height: 14),

              // Encabezado del Reporte: Frente y Fecha
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE3E1D9), width: 0.8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Datos del Reporte',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: textPrimary),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          flex: 3,
                          child: TextFormField(
                            controller: _frenteController,
                            style: const TextStyle(fontSize: 13),
                            validator: (v) => (v == null || v.trim().isEmpty) ? 'Requerido' : null,
                            decoration: const InputDecoration(
                              labelText: 'Frente de Trabajo *',
                              hintText: 'Ej. Frente Norte - Nivel 4',
                              border: OutlineInputBorder(),
                              contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          flex: 2,
                          child: TextFormField(
                            controller: _fechaController,
                            readOnly: true,
                            style: const TextStyle(fontSize: 13),
                            onTap: () async {
                              final d = await showDatePicker(
                                context: context,
                                initialDate: DateTime.now(),
                                firstDate: DateTime(2024),
                                lastDate: DateTime(2030),
                              );
                              if (d != null) {
                                _fechaController.text = d.toIso8601String().substring(0, 10);
                              }
                            },
                            decoration: const InputDecoration(
                              labelText: 'Fecha *',
                              prefixIcon: Icon(Icons.calendar_today, size: 16),
                              border: OutlineInputBorder(),
                              contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Fila GPS y Evidencia Fotográfica
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _obtainingGps ? null : _obtenerGps,
                            icon: _obtainingGps
                                ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 1.5))
                                : Icon(Icons.location_on, size: 16, color: _latitud != null ? Colors.green.shade700 : const Color(0xFF0C447C)),
                            label: Text(
                              _latitud != null
                                  ? '${_latitud!.toStringAsFixed(3)}, ${_longitud!.toStringAsFixed(3)}'
                                  : 'Obtener GPS',
                              style: const TextStyle(fontSize: 11),
                            ),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _tomarFoto,
                            icon: Icon(
                              Icons.camera_alt,
                              size: 16,
                              color: _evidenciaUrl != null ? Colors.green.shade700 : const Color(0xFF0C447C),
                            ),
                            label: Text(
                              _evidenciaUrl != null ? 'Foto Tomada' : 'Foto Evidencia',
                              style: const TextStyle(fontSize: 11),
                            ),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // APARTADO A: Avance Planeado
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF7F9FC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF0C447C).withAlpha(77), width: 1),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.check_circle, size: 16, color: Color(0xFF0C447C)),
                        const SizedBox(width: 6),
                        const Text(
                          'Apartado A: Avance Planeado',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0C447C),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Seleccione un material de catálogo e indique cantidad.',
                      style: TextStyle(fontSize: 11, color: textSecondary),
                    ),
                    const SizedBox(height: 10),

                    // Selector de Material
                    InkWell(
                      onTap: _loadingMaterials ? null : _showMaterialPickerBottomSheet,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFC9C7BD)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.search, size: 16, color: Color(0xFF5F5E5A)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _selectedPlaneadoMaterial != null
                                    ? '${_selectedPlaneadoMaterial!['codigo']} - ${_selectedPlaneadoMaterial!['descripcion']}'
                                    : (_loadingMaterials ? 'Cargando catálogo...' : 'Tocar para buscar y seleccionar material...'),
                                style: TextStyle(
                                  fontSize: 12,
                                  color: _selectedPlaneadoMaterial != null ? textPrimary : const Color(0xFF8B8A84),
                                  fontWeight: _selectedPlaneadoMaterial != null ? FontWeight.bold : FontWeight.normal,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const Icon(Icons.arrow_drop_down, color: Color(0xFF5F5E5A)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Cantidad y Botón Agregar
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _cantidadPlaneadoController,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            style: const TextStyle(fontSize: 13),
                            decoration: const InputDecoration(
                              labelText: 'Cantidad',
                              hintText: 'Ej. 10',
                              filled: true,
                              fillColor: Colors.white,
                              border: OutlineInputBorder(),
                              contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton.icon(
                          onPressed: _addPlaneadoItem,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0C447C),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          icon: const Icon(Icons.add, size: 16),
                          label: const Text('Agregar', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // APARTADO B: Avance No Planeado
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFFCF8F2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFBA7517).withAlpha(77), width: 1),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.warning_amber_rounded, size: 16, color: Color(0xFFBA7517)),
                        const SizedBox(width: 6),
                        const Text(
                          'Apartado B: Avance No Planeado',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFFBA7517),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Para retrabajos, extras o modificaciones con descripción libre.',
                      style: TextStyle(fontSize: 11, color: textSecondary),
                    ),
                    const SizedBox(height: 10),

                    // Subtipo y Cantidad
                    Row(
                      children: [
                        Expanded(
                          flex: 3,
                          child: DropdownButtonFormField<String>(
                            initialValue: _selectedSubtipo,
                            decoration: const InputDecoration(
                              labelText: 'Subtipo',
                              filled: true,
                              fillColor: Colors.white,
                              border: OutlineInputBorder(),
                              contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                            ),
                            style: const TextStyle(fontSize: 12, color: textPrimary),
                            items: const [
                              DropdownMenuItem(value: 'retrabajo', child: Text('Retrabajo')),
                              DropdownMenuItem(value: 'extra', child: Text('Trabajo Extra')),
                              DropdownMenuItem(value: 'modificacion', child: Text('Modificación')),
                            ],
                            onChanged: (val) {
                              if (val != null) setState(() => _selectedSubtipo = val);
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          flex: 2,
                          child: TextField(
                            controller: _cantidadNoPlaneadoController,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            style: const TextStyle(fontSize: 13),
                            decoration: const InputDecoration(
                              labelText: 'Cantidad',
                              hintText: 'Ej. 5',
                              filled: true,
                              fillColor: Colors.white,
                              border: OutlineInputBorder(),
                              contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Descripción libre del material
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _materialManualController,
                            style: const TextStyle(fontSize: 12),
                            decoration: const InputDecoration(
                              labelText: 'Descripción del Material',
                              hintText: 'Ej. Soporte metálico a medida 4"',
                              filled: true,
                              fillColor: Colors.white,
                              border: OutlineInputBorder(),
                              contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton.icon(
                          onPressed: _addNoPlaneadoItem,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFBA7517),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          icon: const Icon(Icons.add, size: 16),
                          label: const Text('Agregar', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // LISTADO DE ITEMS AGREGADOS
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Detalle de Avances a Reportar (${_itemsList.length})',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: textPrimary),
                  ),
                  if (_itemsList.isNotEmpty)
                    TextButton(
                      onPressed: () => setState(() => _itemsList.clear()),
                      child: const Text('Limpiar todos', style: TextStyle(color: Colors.red, fontSize: 11)),
                    ),
                ],
              ),
              const SizedBox(height: 6),

              if (_itemsList.isEmpty)
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE3E1D9), style: BorderStyle.solid),
                  ),
                  child: const Center(
                    child: Text(
                      'No se han agregado materiales al reporte.\nUse los apartados A o B de arriba para añadir items.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Color(0xFF8B8A84), fontSize: 12),
                    ),
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _itemsList.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 6),
                  itemBuilder: (context, index) {
                    final item = _itemsList[index];
                    final isPlaneado = item.tipo == 'planeado';

                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isPlaneado
                              ? const Color(0xFF0C447C).withAlpha(50)
                              : const Color(0xFFBA7517).withAlpha(50),
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: isPlaneado ? const Color(0xFFE6F1FB) : const Color(0xFFFCF4E6),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              isPlaneado ? 'PLANEADO' : (item.subtipo ?? 'NO PLANEADO').toUpperCase(),
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: isPlaneado ? const Color(0xFF0C447C) : const Color(0xFFBA7517),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isPlaneado ? (item.codigo ?? '') : (item.materialManual ?? ''),
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: textPrimary),
                                ),
                                if (isPlaneado && item.descripcion != null)
                                  Text(
                                    item.descripcion!,
                                    style: const TextStyle(fontSize: 10, color: textSecondary),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '${item.cantidad} ${item.unidad ?? 'pza'}',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: textPrimary),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
                            onPressed: () => _removeItem(index),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              const SizedBox(height: 20),

              // Botón Final Guardar Reporte Completo
              ElevatedButton.icon(
                onPressed: _saving ? null : _guardarReporteCompleto,
                style: ElevatedButton.styleFrom(
                  backgroundColor: fillPrimary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: _saving
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 1.8))
                    : const Icon(Icons.save, size: 18),
                label: Text(
                  _saving ? 'Guardando Reporte...' : 'Guardar Reporte de Avance Diario',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
