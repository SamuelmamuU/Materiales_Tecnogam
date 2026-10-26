import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IniciarJornadaDto {
  @ApiPropertyOptional({
    description: 'Notas u observaciones al iniciar la jornada',
  })
  notas?: string;
}

export class CambiarEstadoJornadaDto {
  @ApiProperty({
    enum: ['TRABAJANDO', 'TIEMPO_MUERTO', 'COMIDA'],
    description: 'Nuevo estado operativo al que transiciona la jornada',
  })
  nuevoEstado!: 'TRABAJANDO' | 'TIEMPO_MUERTO' | 'COMIDA';

  @ApiPropertyOptional({
    description: 'Causa o motivo del tiempo muerto o pausa operativa',
  })
  motivo?: string;
}

export class FinalizarJornadaDto {
  @ApiPropertyOptional({
    description: 'Notas u observaciones al cierre de jornada',
  })
  notas?: string;
}
