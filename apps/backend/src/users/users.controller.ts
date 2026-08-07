import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiProperty,
} from '@nestjs/swagger';
import { Rol } from '@prisma/client';

class CreateUserDto {
  @ApiProperty({ example: 'ingeniero@tecnogam.com' })
  email!: string;

  @ApiProperty({ example: 'Carlos Mendoza' })
  nombre!: string;

  @ApiProperty({ example: 'password123' })
  password!: string;

  @ApiProperty({ enum: Rol, example: 'supervisor' })
  rol!: Rol;

  @ApiProperty({ example: true, required: false })
  activo?: boolean;
}

class UpdateUserDto {
  @ApiProperty({ example: 'ingeniero_new@tecnogam.com', required: false })
  email?: string;

  @ApiProperty({ example: 'Carlos Mendoza S.', required: false })
  nombre?: string;

  @ApiProperty({ example: 'newpassword123', required: false })
  password?: string;

  @ApiProperty({ enum: Rol, example: 'supervisor', required: false })
  rol?: Rol;

  @ApiProperty({ example: false, required: false })
  activo?: boolean;
}

@ApiTags('Usuarios')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('administrador')
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary:
      'Obtener la lista de todos los usuarios registrados (Solo Administrador)',
  })
  @ApiResponse({ status: 200, description: 'Retorna la lista de usuarios.' })
  async getAllUsers() {
    return this.usersService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo usuario (Solo Administrador)' })
  @ApiResponse({ status: 201, description: 'Usuario creado con éxito.' })
  @ApiResponse({ status: 409, description: 'El correo electrónico ya existe.' })
  async createUser(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar un usuario existente (Solo Administrador)',
  })
  @ApiResponse({ status: 200, description: 'Usuario actualizado con éxito.' })
  @ApiResponse({ status: 404, description: 'El usuario no existe.' })
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un usuario (Solo Administrador)' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado.' })
  @ApiResponse({ status: 404, description: 'El usuario no existe.' })
  async deleteUser(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
