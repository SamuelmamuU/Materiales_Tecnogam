import 'package:flutter/material.dart';
import '../../data/sources/local_database.dart';
import '../../data/sources/api_config.dart';
import '../widgets/project_header_banner.dart';

class CaptureTiempoMuertoScreen extends StatefulWidget {
  final String? projectId;

  const CaptureTiempoMuertoScreen({super.key, this.projectId});

  @override
  State<CaptureTiempoMuertoScreen> createState() => _CaptureTiempoMuertoScreenState();
}

class _CaptureTiempoMuertoScreenState extends State<CaptureTiempoMuertoScreen> {
  final _formKey = GlobalKey<FormState>();
  final _frenteController = TextEditingController();
  final _causaController = TextEditingController();
  final _duracionController = TextEditingController();
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
    _frenteController.dispose();
    _causaController.dispose();
    _duracionController.dispose();
    super.dispose();
  }

  Future<void> _guardarLocal() async {
    if (!_formKey.currentState!.validate()) return;

    final frente = _frenteController.text.trim();
    final causa = _causaController.text.trim();
    final duracion = double.parse(_duracionController.text.trim());

    final uuid = DateTime.now().microsecondsSinceEpoch.toString();

    final pendingTime = {
      'id': 'tm-$uuid',
      'proyecto_id': _activeProjectId,
      'frente': frente,
      'causa': causa,
      'duracion': duracion,
      'fecha': DateTime.now().toIso8601String(),
    };

    await LocalDatabase.instance.insertTiempoMuerto(pendingTime);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tiempo muerto guardado localmente (Offline)')),
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
        title: const Text('Reportar Tiempo Muerto', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
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

              // Frente de Trabajo
              const Text('Frente de Trabajo', style: TextStyle(color: textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
              const SizedBox(height: 4),
              TextFormField(
                controller: _frenteController,
                style: const TextStyle(fontSize: 14, color: textPrimary),
                decoration: InputDecoration(
                  hintText: 'Ej. Frente Sur - Nivel 1',
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

              // Causa de la Demora
              const Text('Causa del Paro', style: TextStyle(color: textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
              const SizedBox(height: 4),
              TextFormField(
                controller: _causaController,
                style: const TextStyle(fontSize: 14, color: textPrimary),
                decoration: InputDecoration(
                  hintText: 'Ej. Falta de permisos, lluvia, material no disponible',
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

              // Duración en Horas
              const Text('Duración Estimada (Horas)', style: TextStyle(color: textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
              const SizedBox(height: 4),
              TextFormField(
                controller: _duracionController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                style: const TextStyle(fontSize: 14, color: textPrimary),
                decoration: InputDecoration(
                  hintText: 'Ej. 2.5',
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: const BorderSide(color: Color(0xFFE3E1D9)),
                  ),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) return 'Campo requerido';
                  final val = double.tryParse(value.trim());
                  if (val == null || val <= 0) return 'Ingrese un número válido mayor a 0';
                  return null;
                },
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
                child: const Text('Guardar Tiempo Muerto', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
