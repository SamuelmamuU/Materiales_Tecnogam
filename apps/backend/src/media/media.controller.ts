import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Almacenamiento de Evidencia (Media)')
@Controller('media')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir una imagen de evidencia fotográfica' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen (jpg, jpeg, png, gif, webp)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Imagen cargada con éxito. Retorna la URL de la imagen.',
  })
  @ApiResponse({
    status: 400,
    description: 'Archivo inválido o tipo de formato no soportado.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado (Token ausente o expirado).',
  })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.mediaService.uploadFile(file);
  }
}
