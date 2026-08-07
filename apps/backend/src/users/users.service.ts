import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../common/utils/crypto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(data: Prisma.UsuarioCreateInput) {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictException(
        'Un usuario con este correo ya está registrado.',
      );
    }

    const hashedPassword = hashPassword(data.password);
    return this.prisma.usuario.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        createdAt: true,
      },
    });
  }
}
