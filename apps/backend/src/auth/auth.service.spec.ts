/* eslint-disable @typescript-eslint/unbound-method */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { hashPassword } from '../common/utils/crypto';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('debería autenticar con éxito si las credenciales y el rol coinciden', async () => {
      const plainPassword = 'password123';
      const storedHash = hashPassword(plainPassword);
      const mockUser = {
        id: 'user-id',
        email: 'user@test.com',
        nombre: 'Test User',
        password: storedHash,
        rol: 'supervisor',
        activo: true,
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockJwtService.sign.mockImplementation((payload, options) => {
        if (options.secret.includes('access')) return 'access-token';
        return 'refresh-token';
      });

      const result = await service.login(
        'user@test.com',
        plainPassword,
        'supervisor',
      );

      expect(usersService.findByEmail).toHaveBeenCalledWith('user@test.com');
      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(result.user.rol).toBe('supervisor');
    });

    it('debería rechazar si el usuario no existe', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login('invalid@test.com', 'password', 'supervisor'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debería rechazar si la contraseña es incorrecta', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@test.com',
        password: hashPassword('password123'),
        rol: 'supervisor',
        activo: true,
      };
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.login('user@test.com', 'wrongpassword', 'supervisor'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debería rechazar si el usuario está inactivo', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@test.com',
        password: hashPassword('password123'),
        rol: 'supervisor',
        activo: false,
      };
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.login('user@test.com', 'password123', 'supervisor'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería rechazar si el rol solicitado no coincide con su rol de base de datos', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@test.com',
        password: hashPassword('password123'),
        rol: 'supervisor',
        activo: true,
      };
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.login('user@test.com', 'password123', 'trabajador'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('refresh y logout', () => {
    it('debería emitir nuevos tokens si el refresh token es válido', async () => {
      const plainPassword = 'password123';
      const storedHash = hashPassword(plainPassword);
      const mockUser = {
        id: 'user-id',
        email: 'user@test.com',
        nombre: 'Test User',
        password: storedHash,
        rol: 'supervisor',
        activo: true,
      };

      // Primero hacemos login para registrar el refresh token en memoria
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token-123');

      const loginRes = await service.login(
        'user@test.com',
        'password123',
        'supervisor',
      );
      const activeRefreshToken = loginRes.refreshToken;

      // Configuramos el mock de verificación del refresh token
      mockJwtService.verify.mockReturnValue({ sub: 'user-id' });
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const refreshRes = await service.refresh(activeRefreshToken);

      expect(refreshRes).toHaveProperty('accessToken', 'new-access-token');
      expect(refreshRes).toHaveProperty('refreshToken', 'new-refresh-token');
    });

    it('debería fallar al refrescar si el token fue revocado o no existe', async () => {
      await expect(service.refresh('unknown-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debería invalidar el token al hacer logout', async () => {
      const plainPassword = 'password123';
      const storedHash = hashPassword(plainPassword);
      const mockUser = {
        id: 'user-id',
        email: 'user@test.com',
        nombre: 'Test User',
        password: storedHash,
        rol: 'supervisor',
        activo: true,
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token-logout');
      const loginRes = await service.login(
        'user@test.com',
        'password123',
        'supervisor',
      );

      // Cierra sesión
      await service.logout(loginRes.refreshToken);

      // Si intentamos hacer refresh de nuevo, debería fallar
      await expect(service.refresh(loginRes.refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
