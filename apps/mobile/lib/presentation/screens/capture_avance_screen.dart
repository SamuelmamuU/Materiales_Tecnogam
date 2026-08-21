// ignore_for_file: prefer_final_fields, deprecated_member_use
import 'dart:convert';
import 'package:flutter/material.dart';
import '../../data/sources/local_database.dart';
import '../../data/sources/location_service.dart';
import 'camera_capture_screen.dart';

class CaptureAvanceScreen extends StatefulWidget {
  const CaptureAvanceScreen({super.key});

  @override
  State<CaptureAvanceScreen> createState() => _CaptureAvanceScreenState();
}

class _CaptureAvanceScreenState extends State<CaptureAvanceScreen> {
  final _formKey = GlobalKey<FormState>();
  final _frenteController = TextEditingController();
  final _cantidadController = TextEditingController();
  final _materialManualController = TextEditingController();

  String _tipoAvance = 'planeado'; // planeado | no_planeado
  String _selectedSubtipo = 'retrabajo'; // retrabajo | extra | modificacion
  String _selectedMaterialId = 'DG-1200'; // materialId de catalogo
  
  double? _latitud;
  double? _longitud;
  String? _evidenciaUrl;
  bool _obtainingGps = false;
  bool _takingPhoto = false;

  // Catálogo simplificado para selección rápida offline
  final List<Map<String, String>> _catalogoMateriales = [
    {'id': 'DG-1200', 'codigo': 'DG-1200', 'nombre': 'Ducto galvanizado 12"'},
    {'id': 'AT-0450', 'codigo': 'AT-0450', 'nombre': 'Aislamiento térmico 2"'},
    {'id': 'VL-2210', 'codigo': 'VL-2210', 'nombre': 'Válvula de compuerta 4"'},
  ];

  @override
  void dispose() {
    _frenteController.dispose();
    _cantidadController.dispose();
    _materialManualController.dispose();
    super.dispose();
  }

  // Obtener geolocalización física
  Future<void> _obtenerGps() async {
    setState(() {
      _obtainingGps = true;
    });
    try {
      final pos = await LocationService.getCurrentLocation();
      if (pos != null && mounted) {
        setState(() {
          _latitud = pos.latitude;
          _longitud = pos.longitude;
          _obtainingGps = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ubicación GPS obtenida con éxito')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _obtainingGps = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error GPS: $e'), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  // Capturar foto física con la cámara
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

    final frente = _frenteController.text.trim();
    final cantidad = double.parse(_cantidadController.text.trim());

    // Crear el item del avance
    final item = {
      'tipo': _tipoAvance,
      'cantidad': cantidad,
      if (_tipoAvance == 'planeado') 'materialId': _selectedMaterialId,
      if (_tipoAvance == 'no_planeado') ...{
        'subtipo': _selectedSubtipo,
        'materialManual': _materialManualController.text.trim(),
      }
    };

    final itemsList = [item];

    // Obtener id del proyecto (usamos el seeded por defecto)
    final uuid = DateTime.now().microsecondsSinceEpoch.toString(); // UUID alternativo rápido offline

    final pendingAvance = {
      'id': 'av-$uuid',
      'proyecto_id': 'e5911ce8-c7ff-44f6-9f6a-48472f25e77f', // ID del proyecto semilla
      'fecha': DateTime.now().toIso8601String(),
      'frente': frente,
      'latitud': _latitud,
      'longitud': _longitud,
      'evidencia_url': _evidenciaUrl,
      'items_json': jsonEncode(itemsList),
    };

    await LocalDatabase.instance.insertAvance(pendingAvance);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Avance guardado localmente (Modo Offline)')),
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
        title: const Text('Capturar Avance', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Frente de Trabajo
              const Text('Frente de Trabajo', style: TextStyle(color: textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
              const SizedBox(height: 4),
              TextFormField(
                controller: _frenteController,
                style: const TextStyle(fontSize: 14, color: textPrimary),
                decoration: InputDecoration(
                  hintText: 'Ej. Frente Norte - Nivel 4',
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
                validator: (val) => val == null || val.isEmpty ? 'Frente requerido' : null,
              ),
              const SizedBox(height: 16),

              // Selector Tipo Avance
              const Text('Tipo de Avance', style: TextStyle(color: textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
              const SizedBox(height: 4),
              Row(
                children: [
                  Expanded(
                    child: RadioListTile<String>(
                      title: const Text('Planeado', style: TextStyle(fontSize: 13)),
                      value: 'planeado',
                      groupValue: _tipoAvance,
                      onChanged: (val) {
                        if (val != null) setState(() => _tipoAvance = val);
                      },
                    ),
                  ),
                  Expanded(
                    child: RadioListTile<String>(
                      title: const Text('No Planeado', style: TextStyle(fontSize: 13)),
                      value: 'no_planeado',
                      groupValue: _tipoAvance,
                      onChanged: (val) {
                        if (val != null) setState(() => _tipoAvance = val);
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Campos Dinámicos según tipo de avance
              if (_tipoAvance == 'planeado') ...[
                const Text('Material de Catálogo', style: TextStyle(color: textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
                const SizedBox(height: 4),
                DropdownButtonFormField<String>(
                  value: _selectedMaterialId,
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  items: _catalogoMateriales
                      .map((mat) => DropdownMenuItem(
                            value: mat['id'],
                            child: Text(mat['nombre']!, style: const TextStyle(fontSize: 13)),
                          ))
                      .toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedMaterialId = val);
                  },
                ),
              ] else ...[
                // Subtipo
                const Text('Subtipo', style: TextStyle(color: textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
                const SizedBox(height: 4),
                DropdownButtonFormField<String>(
                  value: _selectedSubtipo,
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'retrabajo', child: Text('Retrabajo', style: TextStyle(fontSize: 13))),
                    DropdownMenuItem(value: 'extra', child: Text('Trabajo Extra', style: TextStyle(fontSize: 13))),
                    DropdownMenuItem(value: 'modificacion', child: Text('Modificación', style: TextStyle(fontSize: 13))),
                  ],
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedSubtipo = val);
                  },
                ),
                const SizedBox(height: 16),

                // Descripción Material Manual
                const Text('Descripción de Material (Texto Libre)', style: TextStyle(color: textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
                const SizedBox(height: 4),
                TextFormField(
                  controller: _materialManualController,
                  style: const TextStyle(fontSize: 14, color: textPrimary),
                  decoration: InputDecoration(
                    hintText: 'Ej. Cable de cobre calibre 10',
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  validator: (val) => _tipoAvance == 'no_planeado' && (val == null || val.isEmpty) ? 'Descripción requerida' : null,
                ),
              ],
              const SizedBox(height: 16),

              // Cantidad
              const Text('Cantidad', style: TextStyle(color: textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
              const SizedBox(height: 4),
              TextFormField(
                controller: _cantidadController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                style: const TextStyle(fontSize: 14, color: textPrimary),
                decoration: InputDecoration(
                  hintText: 'Ej. 25.5',
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
                validator: (val) {
                  if (val == null || val.isEmpty) return 'Cantidad requerida';
                  if (double.tryParse(val) == null) return 'Ingrese un número válido';
                  return null;
                },
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
