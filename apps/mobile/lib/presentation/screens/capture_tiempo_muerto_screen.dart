import 'package:flutter/material.dart';
import '../../data/sources/local_database.dart';

class CaptureTiempoMuertoScreen extends StatefulWidget {
  const CaptureTiempoMuertoScreen({super.key});

  @override
  State<CaptureTiempoMuertoScreen> createState() => _CaptureTiempoMuertoScreenState();
}

class _CaptureTiempoMuertoScreenState extends State<CaptureTiempoMuertoScreen> {
  final _formKey = GlobalKey<FormState>();
  final _frenteController = TextEditingController();
  final _causaController = TextEditingController();
  final _duracionController = TextEditingController();

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
      'proyecto_id': 'e5911ce8-c7ff-44f6-9f6a-48472f25e77f',
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
                  hintText: 'Ej. Frente Sur - Nivel 1',
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
                validator: (val) => val == null || val.isEmpty ? 'Frente requerido' : null,
              ),
              const SizedBox(height: 16),

              // Causa del Tiempo Muerto
              const Text('Causa del Tiempo Muerto', style: TextStyle(color: textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
              const SizedBox(height: 4),
              TextFormField(
                controller: _causaController,
                maxLines: 2,
                style: const TextStyle(fontSize: 14, color: textPrimary),
                decoration: InputDecoration(
                  hintText: 'Ej. Lluvia fuerte / Falta de andamios',
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
                validator: (val) => val == null || val.isEmpty ? 'Causa requerida' : null,
              ),
              const SizedBox(height: 16),

              // Duración (horas)
              const Text('Duración (en horas)', style: TextStyle(color: textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
              const SizedBox(height: 4),
              TextFormField(
                controller: _duracionController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                style: const TextStyle(fontSize: 14, color: textPrimary),
                decoration: InputDecoration(
                  hintText: 'Ej. 1.5',
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
                validator: (val) {
                  if (val == null || val.isEmpty) return 'Duración requerida';
                  if (double.tryParse(val) == null) return 'Ingrese un número válido';
                  return null;
                },
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
