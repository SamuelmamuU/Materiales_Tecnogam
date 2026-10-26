import 'package:flutter/material.dart';
import '../../data/repositories/specialized_avance_service.dart';
import '../../data/sources/api_config.dart';
import '../widgets/project_header_banner.dart';

class CaptureAvanceEspecializadoScreen extends StatefulWidget {
  final String? projectId;

  const CaptureAvanceEspecializadoScreen({super.key, this.projectId});

  @override
  State<CaptureAvanceEspecializadoScreen> createState() =>
      _CaptureAvanceEspecializadoScreenState();
}

class _CaptureAvanceEspecializadoScreenState
    extends State<CaptureAvanceEspecializadoScreen> {
  String _selectedModulo = 'instrumentacion'; // instrumentacion | valvulas | motor
  List<Map<String, dynamic>> _rows = [];
  bool _loading = true;
  String _searchQuery = '';
  late String _activeProjectId;

  @override
  void initState() {
    super.initState();
    _activeProjectId = widget.projectId ?? ApiConfig.defaultProjectId;
    _initData();
  }

  Future<void> _initData() async {
    final pid = widget.projectId ?? await ApiConfig.instance.getActiveProjectId();
    if (mounted) {
      setState(() {
        _activeProjectId = pid ?? ApiConfig.defaultProjectId;
      });
      await _loadRows();
    }
  }

  Future<void> _loadRows() async {
    setState(() => _loading = true);
    try {
      final data = await SpecializedAvanceService.instance.getRows(
        _activeProjectId,
        _selectedModulo,
      );
      if (mounted) {
        setState(() {
          _rows = data;
        });
      }
    } catch (_) {
      // Ignorar errores menores
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleCell(String rowId, String columnKey, dynamic currentVal) async {
    final isCurrentlyChecked = SpecializedAvanceService.isChecked(currentVal);
    final newVal = isCurrentlyChecked ? '0' : '1';

    // Actualización optimista local
    setState(() {
      final index = _rows.indexWhere((r) => r['id'] == rowId);
      if (index != -1) {
        _rows[index][columnKey] = newVal;
      }
    });

    try {
      final ok = await SpecializedAvanceService.instance.updateRow(
        _activeProjectId,
        _selectedModulo,
        rowId,
        {columnKey: newVal},
      );
      if (!ok && mounted) {
        // Revertir si falló
        setState(() {
          final index = _rows.indexWhere((r) => r['id'] == rowId);
          if (index != -1) {
            _rows[index][columnKey] = currentVal;
          }
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error al guardar cambio en servidor.')),
        );
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          final index = _rows.indexWhere((r) => r['id'] == rowId);
          if (index != -1) {
            _rows[index][columnKey] = currentVal;
          }
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    const surface0 = Color(0xFFF7F7F5);
    const surface1 = Color(0xFFF1EFE8);
    const textPrimary = Color(0xFF1C1C1A);
    const textSecondary = Color(0xFF5F5E5A);

    final columns = SpecializedAvanceService.instance.getColumnsForModule(_selectedModulo);

    final filteredRows = _rows.where((row) {
      if (_searchQuery.isEmpty) return true;
      final tag = (row['tag'] ?? '').toString().toLowerCase();
      final desc = (row['descripcion'] ?? row['servicio'] ?? '').toString().toLowerCase();
      return tag.contains(_searchQuery.toLowerCase()) || desc.contains(_searchQuery.toLowerCase());
    }).toList();

    return Scaffold(
      backgroundColor: surface0,
      appBar: AppBar(
        backgroundColor: surface1,
        title: const Text(
          'Avances Especializados',
          style: TextStyle(color: textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: textSecondary),
            onPressed: _loading ? null : _loadRows,
          ),
        ],
      ),
      body: Column(
        children: [
          // Banner de Proyecto Activo con Logos Tecnogam y Cliente
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 6),
            child: ProjectHeaderBanner(
              compact: true,
              onProjectChanged: (p) {
                setState(() {
                  _activeProjectId = p.id;
                });
                _loadRows();
              },
            ),
          ),

          // Selector de Módulo
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: surface1,
            child: Row(
              children: [
                _buildModuleTab('instrumentacion', 'Instrumentación', Icons.tune),
                const SizedBox(width: 8),
                _buildModuleTab('valvulas', 'Válvulas', Icons.water_drop_outlined),
                const SizedBox(width: 8),
                _buildModuleTab('motor', 'Motores', Icons.electric_bolt),
              ],
            ),
          ),

          // Buscador rápido de Tags
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Buscar por Tag o descripción...',
                prefixIcon: const Icon(Icons.search, size: 20),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFFE3E1D9)),
                ),
              ),
              onChanged: (val) => setState(() => _searchQuery = val.trim()),
            ),
          ),

          // Lista de Equipos con Checkboxes
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : filteredRows.isEmpty
                    ? Center(
                        child: Text(
                          _rows.isEmpty
                              ? 'No hay registros cargados en este módulo.'
                              : 'No se encontraron equipos con "$_searchQuery".',
                          style: const TextStyle(color: textSecondary, fontSize: 13),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        itemCount: filteredRows.length,
                        itemBuilder: (context, index) {
                          final row = filteredRows[index];
                          return _buildEquipmentCard(row, columns);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildModuleTab(String moduloKey, String label, IconData icon) {
    final isSelected = _selectedModulo == moduloKey;
    return Expanded(
      child: InkWell(
        onTap: () {
          if (_selectedModulo != moduloKey) {
            setState(() => _selectedModulo = moduloKey);
            _loadRows();
          }
        },
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF1C1C1A) : Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected ? const Color(0xFF1C1C1A) : const Color(0xFFE3E1D9),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 14,
                color: isSelected ? Colors.white : const Color(0xFF5F5E5A),
              ),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: isSelected ? Colors.white : const Color(0xFF1C1C1A),
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEquipmentCard(
    Map<String, dynamic> row,
    List<SpecializedColumnDef> columns,
  ) {
    final tag = row['tag'] ?? 'Sin Tag';
    final desc = row['servicio'] ?? row['descripcion'] ?? row['tipoInstrumento'] ?? '';
    final rowId = row['id'];

    int completed = 0;
    for (final col in columns) {
      if (SpecializedAvanceService.isChecked(row[col.key])) {
        completed++;
      }
    }
    final pct = columns.isNotEmpty ? (completed / columns.length * 100).round() : 0;

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE3E1D9), width: 0.8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Cabecera de la Tarjeta del Equipo
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        tag,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1C1C1A),
                        ),
                      ),
                      if (desc.toString().isNotEmpty)
                        Text(
                          desc.toString(),
                          style: const TextStyle(fontSize: 11, color: Color(0xFF5F5E5A)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                    ],
                  ),
                ),
                // Indicador de avance del Tag
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: pct == 100 ? const Color(0xFFEAF3DE) : const Color(0xFFF1EFE8),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '$completed/${columns.length} ($pct%)',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: pct == 100 ? const Color(0xFF27500A) : const Color(0xFF5F5E5A),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            const Divider(height: 1, color: Color(0xFFF1EFE8)),
            const SizedBox(height: 8),

            // Grid de Checkboxes táctiles
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: columns.map((col) {
                final isDone = SpecializedAvanceService.isChecked(row[col.key]);
                return InkWell(
                  onTap: () => _toggleCell(rowId, col.key, row[col.key]),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: isDone ? const Color(0xFFEAF3DE) : const Color(0xFFF7F7F5),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isDone ? const Color(0xFFC0DD9D) : const Color(0xFFE3E1D9),
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          isDone ? Icons.check_circle : Icons.radio_button_unchecked,
                          size: 15,
                          color: isDone ? const Color(0xFF27500A) : const Color(0xFF8B8A84),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          col.label,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: isDone ? FontWeight.bold : FontWeight.w500,
                            color: isDone ? const Color(0xFF27500A) : const Color(0xFF1C1C1A),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}
