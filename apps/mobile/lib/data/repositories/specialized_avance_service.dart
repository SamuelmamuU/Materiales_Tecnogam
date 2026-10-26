import '../sources/api_service.dart';

class SpecializedColumnDef {
  final String key;
  final String label;
  final bool isCheck;
  final List<String>? options;

  const SpecializedColumnDef({
    required this.key,
    required this.label,
    this.isCheck = true,
    this.options,
  });
}

class SpecializedAvanceService {
  static final SpecializedAvanceService instance = SpecializedAvanceService._init();
  SpecializedAvanceService._init();

  static const List<SpecializedColumnDef> columnsInstrumentacion = [
    SpecializedColumnDef(key: 'instaladoPlanta', label: 'Instalado Planta'),
    SpecializedColumnDef(key: 'cableado', label: 'Cableado'),
    SpecializedColumnDef(key: 'peinadoCinchado', label: 'Peinado y Cinchado'),
    SpecializedColumnDef(key: 'conexionPlanta', label: 'Conexión Planta'),
    SpecializedColumnDef(key: 'conexionTablero', label: 'Conexión Tablero'),
    SpecializedColumnDef(key: 'pruebas', label: 'Pruebas'),
  ];

  static const List<SpecializedColumnDef> columnsValvulas = [
    SpecializedColumnDef(key: 'cableadoNeum', label: 'Cableado Tubing'),
    SpecializedColumnDef(key: 'peinadoNeum', label: 'Peinado/Cinchado'),
    SpecializedColumnDef(
      key: 'conectorRapido',
      label: 'Conector Rápido',
      isCheck: false,
      options: ['Pendiente', 'Listo', 'No Aplica'],
    ),
    SpecializedColumnDef(key: 'conexionPlantaNeum', label: 'Conexión Planta Neum.'),
    SpecializedColumnDef(key: 'conexionManifold', label: 'Conexión Manifold'),
    SpecializedColumnDef(key: 'pruebasNeum', label: 'Pruebas Neumáticas'),
    SpecializedColumnDef(key: 'cableadoCtrl', label: 'Cableado Eléc.'),
    SpecializedColumnDef(key: 'peinadoCtrl', label: 'Peinado Cable'),
    SpecializedColumnDef(
      key: 'sensorPosicion',
      label: 'Sensor de posición',
      isCheck: false,
      options: ['Pendiente', 'Listo', 'No Aplica'],
    ),
    SpecializedColumnDef(key: 'conexionPlantaCtrl', label: 'Conexión Planta Ctrl'),
    SpecializedColumnDef(key: 'conexionTableroCtrl', label: 'Conexión Tablero Ctrl'),
    SpecializedColumnDef(key: 'comisioning', label: 'Comisioning'),
    SpecializedColumnDef(key: 'comisionamiento', label: 'Comisionamiento'),
  ];

  static const List<SpecializedColumnDef> columnsMotores = [
    SpecializedColumnDef(key: 'cableado', label: 'Cableado'),
    SpecializedColumnDef(key: 'peinadoCinchado', label: 'Peinado y Cinchado'),
    SpecializedColumnDef(key: 'pruebasAislMotor', label: 'Prueba Aisl. Motor'),
    SpecializedColumnDef(key: 'pruebasAislCirc', label: 'Prueba Aisl. Circuito'),
    SpecializedColumnDef(key: 'conexionMotor', label: 'Conexión Motor'),
    SpecializedColumnDef(key: 'conexionCcm', label: 'Conexión CCM'),
    SpecializedColumnDef(key: 'motorSoloRun', label: 'Motor Solo Run'),
  ];

  static bool isChecked(dynamic val) {
    if (val == null) return false;
    final str = val.toString().trim().toUpperCase();
    return str == '1' || str == 'LISTO' || str == 'CONECTADO' || str == 'NO APLICA';
  }

  List<SpecializedColumnDef> getColumnsForModule(String modulo) {
    switch (modulo.toLowerCase()) {
      case 'valvulas':
        return columnsValvulas;
      case 'motor':
      case 'motores':
        return columnsMotores;
      case 'instrumentacion':
      default:
        return columnsInstrumentacion;
    }
  }

  Future<List<Map<String, dynamic>>> getRows(String projectId, String modulo) async {
    final res = await ApiService.instance.get('/projects/$projectId/avances-especializados/$modulo');
    if (res.success && res.data is List) {
      return List<Map<String, dynamic>>.from(res.data.map((item) => Map<String, dynamic>.from(item)));
    }
    return [];
  }

  Future<bool> updateRow(
    String projectId,
    String modulo,
    String rowId,
    Map<String, dynamic> updates,
  ) async {
    final res = await ApiService.instance.put(
      '/projects/$projectId/avances-especializados/$modulo/rows/$rowId',
      updates,
    );
    return res.success;
  }
}
