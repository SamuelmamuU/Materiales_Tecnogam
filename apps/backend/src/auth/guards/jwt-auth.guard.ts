import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface RequestWithUser extends Request {
  user?: {
    sub: string;
    email: string;
    rol: string;
  };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Token de acceso no proporcionado.');
    }
    try {
      const payload = (await this.jwtService.verifyAsync(token, {
        secret:
          process.env.JWT_ACCESS_SECRET ||
          'super-secret-access-key-control-materiales',
      })) as unknown as { sub: string; email: string; rol: string };
      // Attach user payload to the request
      request.user = payload;
    } catch {
      throw new UnauthorizedException('Token de acceso inválido o expirado.');
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
