import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Rol } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';

class LoginDto {
  @ApiProperty({
    example: 'admin@tecnogam.com',
    description: 'Correo electrónico del usuario',
  })
  email!: string;

  @ApiProperty({ example: 'admin123', description: 'Contraseña del usuario' })
  password!: string;

  @ApiProperty({
    enum: Rol,
    example: 'administrador',
    description: 'Rol solicitado para la sesión',
  })
  rol!: Rol;
}

class RefreshDto {
  @ApiProperty({ description: 'Refresh token emitido en el login' })
  refreshToken!: string;
}

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión con correo, contraseña y rol' })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso, retorna el access y refresh token.',
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas.' })
  @ApiResponse({
    status: 403,
    description: 'El rol solicitado no coincide o el usuario está inactivo.',
  })
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password, body.rol);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renovar el token de acceso utilizando un refresh token válido',
  })
  @ApiResponse({
    status: 200,
    description: 'Nuevos tokens de acceso y refresco generados.',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token vencido, inválido o revocado.',
  })
  async refresh(@Body() body: RefreshDto) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión e invalidar el refresh token' })
  @ApiResponse({ status: 200, description: 'Sesión cerrada con éxito.' })
  logout(@Body() body: RefreshDto) {
    return this.authService.logout(body.refreshToken);
  }
}
