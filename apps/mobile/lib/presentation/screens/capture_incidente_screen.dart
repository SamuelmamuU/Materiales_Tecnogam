import 'package:flutter/material.dart';
import '../../data/sources/local_database.dart';
import '../../data/sources/location_service.dart';
import '../../data/sources/api_config.dart';
import '../widgets/project_header_banner.dart';
import 'camera_capture_screen.dart';

class CaptureIncidenteScreen extends StatefulWidget {
  final String? projectId;

  const CaptureIncidenteScreen({super.key, this.projectId});

  @override
  State<CaptureIncidenteScreen> createState() => _CaptureIncidenteScreenState();
}

class _CaptureIncidenteScreenState extends State<CaptureIncidenteScreen> {
  final _formKey = GlobalKey<FormState>();
  final _descripcionController = TextEditingController();

  String _selectedCategory = 'calidad'; // calidad | seguridad | logistica
  double? _latitud;
  double? _longitud;
  String? _evidenciaUrl;
  bool _obtainingGps = false;
  late String _activeProjectId;

  @override
  void initState() {
    super.initState();
    _activeProjectId = widget.projectId ?? ApiConfig.defaultProjectId;
    _initProject();
  }

  Future<void> _initProject() async {
    final pid = widget.projectId ?? await ApiConfig.instance.getActiveProjectId();
    if (mounted && pid != null) {
      setState(() => _activeProjectId = pid);
    }
  }

  @override
  void dispose() {
    _descripcionController.dispose();
    super.dispose();
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

  Future<void> _guardarLocal() async {
    if (!_formKey.currentState!.validate()) return;

    final descripcion = _descripcionController.text.trim();
    final uuid = DateTime.now().microsecondsSinceEpoch.toString();

    final pendingIncidente = {
      'id': 'inc-$uuid',
      'proyecto_id': _activeProjectId,
      'categoria': _selectedCategory,
      'descripcion': descripcion,
      'fecha': DateTime.now().toIso8601String(),
      'latitud': _latitud,
      'longitud': _longitud,
      'evidencia_url': _evidenciaUrl,
    };

    await LocalDatabase.instance.insertIncidente(pendingIncidente);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Incidente guardado localmente (Offline)')),
      );
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    const surface0 = Color(0xFFF7F7F5);
    const textPrimary = Color(0xFF1C1C1A);
    const textSecondary = Color(0xFF5F5E5A);
    const fillPrimary = Color(0xFF1C1C1A);

    return Scaffold(
      backgroundColor: surface0,
      appBar: AppBar(
        title: const Text('Reportar Incidente', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Banner de Proyecto Activo
              ProjectHeaderBanner(
                compact: true,
                onProjectChanged: (p) => setState(() => _activeProjectId = p.id),
              ),
              const SizedBox(height: 16),

              // Categoría
              const Text('Categoría del Incidente', style: TextStyle(color: textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
              const SizedBox(height: 4),
              DropdownButtonFormField<String>(
                initialValue: _selectedCategory,
                style: const TextStyle(fontSize: 14, color: textPrimary),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: const BorderSide(color: Color(0xFFE3E1D9)),
                  ),
                ),
                items: const [
                  DropdownMenuItem(value: 'calidad', child: Text('Calidad (Fallas, Defectos)')),
                  DropdownMenuItem(value: 'seguridad', child: Text('Seguridad (Acto/Condición Insegura)')),
                  DropdownMenuItem(value: 'logistica', child: Text('Logística (Retraso de Suministro)')),
                ],
                onChanged: (val) {
                  if (val != null) {
                    setState(() {
                      _selectedCategory = val;
                    });
                  }
                },
              ),
              const SizedBox(height: 16),

              // Descripción Detallada
              const Text('Descripción del Evento', style: TextStyle(color: textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
              const SizedBox(height: 4),
              TextFormField(
                controller: _descripcionController,
                maxLines: 4,
                style: const TextStyle(fontSize: 14, color: textPrimary),
                decoration: InputDecoration(
                  hintText: 'Describa lo sucedido, lugar exacto y personal involucrado...',
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: const BorderSide(color: Color(0xFFE3E1D9)),
                  ),
                ),
                validator: (value) => (value == null || value.trim().isEmpty) ? 'Campo requerido' : null,
              ),
              const SizedBox(height: 16),

              // Evidencia Fotográfica y GPS
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _tomarFoto,
                      icon: Icon(Icons.camera_alt, size: 16, color: _evidenciaUrl != null ? Colors.green.shade700 : const Color(0xFF0C447C)),
                      label: Text(_evidenciaUrl != null ? 'Foto Tomada' : 'Tomar Foto', style: const TextStyle(fontSize: 12)),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _obtainingGps ? null : _obtenerGps,
                      icon: _obtainingGps
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 1.5))
                          : Icon(Icons.location_on, size: 16, color: _latitud != null ? Colors.green.shade700 : const Color(0xFF0C447C)),
                      label: Text(
                        _latitud != null ? '${_latitud!.toStringAsFixed(3)}, ${_longitud!.toStringAsFixed(3)}' : 'GPS Actual',
                        style: const TextStyle(fontSize: 12),
                      ),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Botón Guardar
              ElevatedButton(
                onPressed: _guardarLocal,
                style: ElevatedButton.styleFrom(
                  backgroundColor: fillPrimary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: const Text('Guardar Incidente', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
