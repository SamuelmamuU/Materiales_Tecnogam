import 'package:geolocator/geolocator.dart';

class LocationService {
  static Future<Position?> getCurrentLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    try {
      serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw 'El servicio de GPS está desactivado en el dispositivo.';
      }

      permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw 'Permisos de ubicación denegados por el usuario.';
        }
      }
      
      if (permission == LocationPermission.deniedForever) {
        throw 'Permisos de ubicación denegados permanentemente en ajustes.';
      } 

      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      ).timeout(const Duration(seconds: 8));
    } catch (e) {
      if (e is String) {
        rethrow;
      }
      throw 'Error al obtener GPS: $e';
    }
  }
}
