import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProjectGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Acceso denegado: usuario no autenticado.');
    }

    // El Administrador tiene acceso global y se salta el scoping
    if (user.rol === 'administrador') {
      return true;
    }

    // Extrae projectId desde los parámetros de la ruta, query string o el cuerpo de la petición
    const projectId = request.params.projectId || request.query.projectId || request.body.projectId;

    if (!projectId) {
      // Si la ruta no especifica un proyecto, se permite la navegación base
      return true;
    }

    // Valida pertenencia en la tabla miembros_proyecto
    const membership = await this.prisma.memberProyecto.findUnique({
      where: {
        usuarioId_proyectoId: {
          usuarioId: user.sub,
          proyectoId: projectId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Acceso denegado: usted no pertenece a este proyecto.');
    }

    return true;
  }
}
