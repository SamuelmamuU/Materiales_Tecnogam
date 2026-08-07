import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestWithUser } from './jwt-auth.guard';

@Injectable()
export class ProjectGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Acceso denegado: usuario no autenticado.');
    }

    // El Administrador tiene acceso global y se salta el scoping
    if (user.rol === 'administrador') {
      return true;
    }

    // Extrae projectId desde los parámetros de la ruta, query string o el cuerpo de la petición con tipado estricto
    const params = request.params as Record<string, string | undefined>;
    const query = request.query as Record<string, string | undefined>;
    const body = request.body as Record<string, string | undefined>;

    const projectId = params.projectId || query.projectId || body.projectId;

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
      throw new ForbiddenException(
        'Acceso denegado: usted no pertenece a este proyecto.',
      );
    }

    return true;
  }
}
