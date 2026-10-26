import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/repositories/specialized_avance_service.dart';

void main() {
  group('SpecializedAvanceService Logic & Checkbox Tests', () {
    test('isChecked recognises true values properly', () {
      expect(SpecializedAvanceService.isChecked('1'), isTrue);
      expect(SpecializedAvanceService.isChecked(1), isTrue);
      expect(SpecializedAvanceService.isChecked('LISTO'), isTrue);
      expect(SpecializedAvanceService.isChecked('listo'), isTrue);
      expect(SpecializedAvanceService.isChecked('CONECTADO'), isTrue);
      expect(SpecializedAvanceService.isChecked('  1  '), isTrue);
    });

    test('isChecked recognises false or uncompleted values properly', () {
      expect(SpecializedAvanceService.isChecked('0'), isFalse);
      expect(SpecializedAvanceService.isChecked(0), isFalse);
      expect(SpecializedAvanceService.isChecked(''), isFalse);
      expect(SpecializedAvanceService.isChecked(null), isFalse);
      expect(SpecializedAvanceService.isChecked('PENDIENTE'), isFalse);
      expect(SpecializedAvanceService.isChecked('----------'), isFalse);
    });

    test('getColumnsForModule returns correct columns for Instrumentacion', () {
      final cols = SpecializedAvanceService.instance.getColumnsForModule('instrumentacion');
      expect(cols.length, 6);
      final keys = cols.map((c) => c.key).toList();
      expect(keys, contains('instaladoPlanta'));
      expect(keys, contains('cableado'));
      expect(keys, contains('peinadoCinchado'));
      expect(keys, contains('conexionPlanta'));
      expect(keys, contains('conexionTablero'));
      expect(keys, contains('pruebas'));
    });

    test('getColumnsForModule returns correct columns for Valvulas (including comisioning)', () {
      final cols = SpecializedAvanceService.instance.getColumnsForModule('valvulas');
      expect(cols.length, 11);
      final keys = cols.map((c) => c.key).toList();
      expect(keys, contains('cableadoNeum'));
      expect(keys, contains('conexionPlantaNeum'));
      expect(keys, contains('conexionManifold'));
      expect(keys, contains('pruebasNeum'));
      expect(keys, contains('comisioning'));
      expect(keys, contains('comisionamiento'));
    });

    test('getColumnsForModule returns correct columns for Motores', () {
      final cols = SpecializedAvanceService.instance.getColumnsForModule('motor');
      expect(cols.length, 7);
      final keys = cols.map((c) => c.key).toList();
      expect(keys, contains('cableado'));
      expect(keys, contains('peinadoCinchado'));
      expect(keys, contains('pruebasAislMotor'));
      expect(keys, contains('pruebasAislCirc'));
      expect(keys, contains('conexionMotor'));
      expect(keys, contains('conexionCcm'));
      expect(keys, contains('motorSoloRun'));
    });
  });
}
