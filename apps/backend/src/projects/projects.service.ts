import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const project = await this.prisma.proyecto.findUnique({
      where: { id },
      include: {
        hitos: true,
        miembros: {
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
                rol: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('El proyecto solicitado no existe.');
    }

    return project;
  }

  async findAllForUser(userId: string, userRol: string) {
    // Si el usuario es administrador, puede ver todos los proyectos
    if (userRol === 'administrador') {
      return this.prisma.proyecto.findMany({
        include: { hitos: true },
      });
    }

    // Si es supervisor, trabajador o cliente, solo ve los proyectos donde es miembro
    return this.prisma.proyecto.findMany({
      where: {
        miembros: {
          some: {
            usuarioId: userId,
          },
        },
      },
      include: { hitos: true },
    });
  }
}
