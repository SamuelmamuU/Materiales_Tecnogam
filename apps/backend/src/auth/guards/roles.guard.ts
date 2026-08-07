import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Rol } from '@prisma/client';
import { RequestWithUser } from './jwt-auth.guard';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user || !user.rol) {
      throw new ForbiddenException('Acceso denegado: rol no identificado.');
    }

    const hasRole = requiredRoles.includes(user.rol as Rol);
    if (!hasRole) {
      throw new ForbiddenException(
        'Acceso denegado: no tiene el rol requerido.',
      );
    }

    return true;
  }
}
