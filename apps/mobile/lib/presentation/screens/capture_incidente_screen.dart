import 'package:flutter/material.dart';
import '../../data/sources/local_database.dart';

class CaptureIncidenteScreen extends StatefulWidget {
  const CaptureIncidenteScreen({super.key});

  @override
  State<CaptureIncidenteScreen> createState() => _CaptureIncidenteScreenState();
}

class _CaptureIncidenteScreenState extends State<CaptureIncidenteScreen> {
  final _formKey = GlobalKey<FormState>();
  final _descripcionController = TextEditingController();
  String _selectedCategory = 'Seguridad';
  
  double? _latitud;
  double? _longitud;
  String? _evidenciaUrl;
  bool _obtainingGps = false;
  bool _takingPhoto = false;

  final List<String> _categories = ['Seguridad', 'Calidad', 'Clima', 'Logística', 'Otro'];

  @override
  void dispose() {
    _descripcionController.dispose();
    super.dispose();
  }

  // Simulación de lectura GPS
  void _obtenerGps() {
    setState(() {
      _obtainingGps = true;
    });
    Future.delayed(const Duration(milliseconds: 600), () {
      if (mounted) {
        setState(() {
          _latitud = 19.4326;
          _longitud = -99.1332;
          _obtainingGps = false;
        });
      }
    });
  }

  // Simulación de toma fotográfica
  void _tomarFoto() {
    setState(() {
      _takingPhoto = true;
    });
    Future.delayed(const Duration(milliseconds: 800), () {
      if (mounted) {
        setState(() {
          _evidenciaUrl = 'http://localhost:9000/evidencias/inc_${DateTime.now().millisecondsSinceEpoch}.jpg';
          _takingPhoto = false;
        });
      }
    });
  }

  Future<void> _guardarLocal() async {
    if (!_formKey.currentState!.validate()) return;

    final descripcion = _descripcionController.text.trim();
    final uuid = DateTime.now().microsecondsSinceEpoch.toString();

    final pendingIncidente = {
      'id': 'inc-$uuid',
      'proyecto_id': 'e5911ce8-c7ff-44f6-9f6a-48472f25e77f',
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
        padding: const EdgeInsets.all(20.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Categoría del Incidente
              const Text('Categoría del Incidente', style: TextStyle(color: textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
              const SizedBox(height: 4),
              DropdownButtonFormField<String>(
                value: _selectedCategory,
                decoration: InputDecoration(
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
                items: _categories
                    .map((cat) => DropdownMenuItem(
                          value: cat,
                          child: Text(cat, style: const TextStyle(fontSize: 13)),
                        ))
                    .toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedCategory = val);
                },
              ),
              const SizedBox(height: 16),

              // Descripción
              const Text('Descripción del Evento', style: TextStyle(color: textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
              const SizedBox(height: 4),
              TextFormField(
                controller: _descripcionController,
                maxLines: 3,
                style: const TextStyle(fontSize: 14, color: textPrimary),
                decoration: InputDecoration(
                  hintText: 'Detalle lo sucedido (ej. Andamio dañado en sección B, retraso por tormenta)',
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
                validator: (val) => val == null || val.isEmpty ? 'Descripción requerida' : null,
              ),
              const SizedBox(height: 20),

              // Geolocalización y Foto
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _obtainingGps ? null : _obtenerGps,
                      icon: _obtainingGps
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 1.5))
                          : const Icon(Icons.location_on, size: 16),
                      label: Text(
                        _latitud != null ? 'Ubicación OK' : 'Obtener GPS',
                        style: const TextStyle(fontSize: 12),
                      ),
                      style: OutlinedButton.styleFrom(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        side: BorderSide(color: _latitud != null ? Colors.green : const Color(0xFFC9C7BD)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _takingPhoto ? null : _tomarFoto,
                      icon: _takingPhoto
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 1.5))
                          : const Icon(Icons.camera_alt, size: 16),
                      label: Text(
                        _evidenciaUrl != null ? 'Foto cargada' : 'Tomar Foto',
                        style: const TextStyle(fontSize: 12),
                      ),
                      style: OutlinedButton.styleFrom(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        side: BorderSide(color: _evidenciaUrl != null ? Colors.green : const Color(0xFFC9C7BD)),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),

              // Botón Guardar
              ElevatedButton(
                onPressed: _guardarLocal,
                style: ElevatedButton.styleFrom(
                  backgroundColor: fillPrimary,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: const Text('Guardar Local', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
