import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { comparePassword } from '../common/utils/crypto';
import { Rol } from '@prisma/client';

@Injectable()
export class AuthService {
  // Store active refresh tokens in memory to support logout invalidation
  private readonly activeRefreshTokens = new Set<string>();

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, pass: string, requestedRol: Rol) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (!user.activo) {
      throw new ForbiddenException('Su usuario ha sido desactivado.');
    }

    // Compare passwords
    const isPasswordValid = comparePassword(pass, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    // Enforce that the selected role matches their actual role
    if (user.rol !== requestedRol) {
      throw new ForbiddenException(
        'El rol solicitado no coincide con su rol registrado.',
      );
    }

    const payload = { sub: user.id, email: user.email, rol: user.rol };

    // Generate Access Token
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'super-secret-access-key',
      expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
    });

    // Generate Refresh Token
    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key',
        expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
      },
    );

    this.activeRefreshTokens.add(refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      },
    };
  }

  async refresh(token: string) {
    if (!this.activeRefreshTokens.has(token)) {
      throw new UnauthorizedException('Refresh token inválido o revocado.');
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key',
      }) as unknown as { sub: string };

      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.activo) {
        this.activeRefreshTokens.delete(token);
        throw new UnauthorizedException('Usuario no válido o inactivo.');
      }

      // Invalidate the old refresh token
      this.activeRefreshTokens.delete(token);

      // Generate new pair
      const newPayload = { sub: user.id, email: user.email, rol: user.rol };
      const accessToken = this.jwtService.sign(newPayload, {
        secret: process.env.JWT_ACCESS_SECRET || 'super-secret-access-key',
        expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
      });

      const refreshToken = this.jwtService.sign(
        { sub: user.id },
        {
          secret: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key',
          expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
        },
      );

      this.activeRefreshTokens.add(refreshToken);

      return {
        accessToken,
        refreshToken,
      };
    } catch {
      this.activeRefreshTokens.delete(token);
      throw new UnauthorizedException('Refresh token expirado o corrupto.');
    }
  }

  logout(token: string): Promise<{ message: string }> {
    this.activeRefreshTokens.delete(token);
    return Promise.resolve({ message: 'Sesión cerrada con éxito.' });
  }
}
