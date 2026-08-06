import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { firstValueFrom } from 'rxjs';

interface ExternalMaterial {
  modelo: string;
  descripcion: string;
  unidad: string;
  tipo?: string;
  activo?: boolean;
}

interface ExternalResponse {
  data: ExternalMaterial[];
}

const CORRUPT_WORDS_MAP: Record<string, string> = {
  Mdulos: 'Módulos',
  Elctricos: 'Eléctricos',
  FIJACIN: 'FIJACIÓN',
  Conexin: 'Conexión',
  ao: 'año',
  SierraSubmarino: 'Sierra Submarino',
  trifsico: 'trifásico',
  Bsico: 'Básico',
  WEIDMLLER: 'WEIDMÜLLER',
  distribucin: 'distribución',
  seales: 'señales',
  anlogas: 'análogas',
  conexin: 'conexión',
  clasificacin: 'clasificación',
  estaado: 'estañado',
  Categora: 'Categoría',
  Analgicas: 'Analógicas',
  COMUNICACIN: 'COMUNICACIÓN',
  Cauela: 'Cañuela',
  Fijacin: 'Fijación',
  Bimetlica: 'Bimetálica',
  metlico: 'metálico',
  termomagntico: 'termomagnético',
  Alimentacin: 'Alimentación',
  Slido: 'Sólido',
  Bimetlico: 'Bimetálico',
  tubera: 'tubería',
  caon: 'cañón',
  Caon: 'Cañón',
  sealizacion: 'señalización',
  sealizacin: 'señalización',
  Distribucin: 'Distribución',
  botn: 'botón',
  Botn: 'Botón',
  BOTN: 'BOTÓN',
  fijacin: 'fijación',
  plstico: 'plástico',
  plstica: 'plástica',
  Plstico: 'Plástico',
  Conversin: 'Conversión',
  Rgido: 'Rígido',
  mdulo: 'módulo',
  Mdulo: 'Módulo',
  Tamao: 'Tamaño',
  tamao: 'tamaño',
  Vas: 'Vías',
  vas: 'vías',
  Fenlica: 'Fenólica',
  estndar: 'estándar',
  Estndar: 'Estándar',
  termocontrctil: 'termocontráctil',
  Tensin: 'Tensión',
  alimentacin: 'alimentación',
  Lnea: 'Línea',
  lnea: 'línea',
  botonera: 'botonería',
  Botonera: 'Botonería',
  lmpara: 'lámpara',
  Lmpara: 'Lámpara',
  LMPARA: 'LÁMPARA',
  presin: 'presión',
  Albaal: 'Albañal',
  instalacin: 'instalación',
  Termomagntico: 'Termomagnético',
  Retroalimentacin: 'Retroalimentación',
  Metlico: 'Metálico',
  Metlica: 'Metálica',
  METLICO: 'METÁLICO',
  metlica: 'metálica',
  fusin: 'fusión',
  ELCTRICO: 'ELÉCTRICO',
  Elctrico: 'Eléctrico',
  Trifsico: 'Trifásico',
  trifsica: 'trifásica',
  Vlvula: 'Válvula',
  Reduccin: 'Reducción',
  analgico: 'analógico',
  analgicas: 'analógicas',
  areas: 'áreas',
  comunicacin: 'comunicación',
  Comunicacin: 'Comunicación',
  retencin: 'retención',
  fabricacin: 'fabricación',
  Rel: 'Relé',
  rel: 'relé',
  Resolucin: 'Resolución',
  operacin: 'operación',
  Operacin: 'Operación',
  deteccin: 'detección',
  automtica: 'automática',
  Automtico: 'Automático',
  funcin: 'función',
  Funcin: 'Función',
  medicin: 'medición',
  Ua: 'Uña',
  Grfica: 'Gráfica',
  Rpido: 'Rápido',
  ptico: 'Óptico',
  Almbrico: 'Alámbrico',
  Espaol: 'Español',
  proteccin: 'protección',
  electrnico: 'electrónico',
  Electrnico: 'Electrónico',
  tctil: 'táctil',
  Receptculo: 'Receptáculo',
  diagnstico: 'diagnóstico',
  termoplstico: 'termoplástico',
  expansin: 'expansión',
  monofsico: 'monofásico',
  Anloga: 'Análoga',
  Sobretensin: 'Sobretensión',
  Bateras: 'Baterías',
  Unin: 'Unión',
  unin: 'unión',
  accin: 'acción',
  Tecnologa: 'Tecnología',
  conmutacin: 'conmutación',
  TORNILLERA: 'TORNILLERÍA',
  opcin: 'opción',
  interrupcin: 'interrupción',
  Dielctrico: 'Dieléctrico',
  Porttil: 'Portátil',
  Fsica: 'Física',
  carbn: 'carbón',
  Automatizacin: 'Automatización',
  trmico: 'térmico',
  Trmico: 'Térmico',
  sujecin: 'sujeción',
  rpida: 'rápida',
  Divisin: 'División',
  Explosin: 'Explosión',
};

export function cleanString(str: string): string {
  if (!str) return '';
  let cleaned = str;
  for (const [bad, good] of Object.entries(CORRUPT_WORDS_MAP)) {
    cleaned = cleaned.split(bad).join(good);
  }
  // Replace leftover unicode replacement characters
  cleaned = cleaned.replace(/\uFFFD/g, '');
  return cleaned;
}

@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  async findAll(filters: {
    search?: string;
    category?: string;
    active?: string; // Query param is string
    page?: number;
    limit?: number;
  }) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.MaterialWhereInput = {};

    if (filters.search) {
      where.OR = [
        { codigo: { contains: filters.search } },
        { descripcion: { contains: filters.search } },
      ];
    }

    if (filters.category) {
      where.categoria = { contains: filters.category };
    }

    if (filters.active !== undefined) {
      where.activo = filters.active === 'true';
    }

    const [total, data] = await Promise.all([
      this.prisma.material.count({ where }),
      this.prisma.material.findMany({
        where,
        skip,
        take: limit,
        orderBy: { codigo: 'asc' },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async syncWithExternal(): Promise<{
    status: string;
    processed: number;
    skippedEmpty: number;
    skippedDuplicates: number;
    error?: string;
  }> {
    const apiUrl =
      process.env.EXTERNAL_SYSTEM_API_URL ||
      'http://localhost:3000/materials/external-mock';
    const apiToken = process.env.EXTERNAL_SYSTEM_API_TOKEN || 'mock-token';

    this.logger.log(`Iniciando sincronización de materiales desde: ${apiUrl}`);

    try {
      // Call external API
      const response = await firstValueFrom(
        this.httpService.get<ExternalResponse>(apiUrl, {
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
        }),
      );

      const items = response.data?.data;
      if (!Array.isArray(items)) {
        throw new Error(
          'El formato de respuesta de la API externa es inválido.',
        );
      }

      let processed = 0;
      let skippedEmpty = 0;
      let skippedDuplicates = 0;

      const uniqueCodigos = new Set<string>();

      for (const item of items) {
        const rawModelo = item.modelo;
        const rawDescripcion = item.descripcion;
        const rawUnidad = item.unidad;
        const rawTipo = item.tipo;

        // Skip completely empty items
        if (!rawModelo && !rawDescripcion && !rawUnidad) {
          skippedEmpty++;
          continue;
        }

        // Validate basic parameters
        if (!rawModelo || !rawDescripcion || !rawUnidad) {
          skippedEmpty++;
          continue;
        }

        const codigo = cleanString(rawModelo);
        const descripcion = cleanString(rawDescripcion);
        const unidad = cleanString(rawUnidad);
        const categoria = cleanString(rawTipo || 'Sin Categoría');

        // Deduplication in the current sync session
        if (uniqueCodigos.has(codigo)) {
          skippedDuplicates++;
          continue;
        }

        uniqueCodigos.add(codigo);

        // Save (upsert) to local DB
        await this.prisma.material.upsert({
          where: { codigo },
          update: {
            descripcion,
            unidad,
            categoria,
            activo: item.activo ?? true,
          },
          create: {
            codigo,
            descripcion,
            unidad,
            categoria,
            activo: item.activo ?? true,
          },
        });

        processed++;
      }

      this.logger.log(
        `Sincronización finalizada. Procesados: ${processed}, Ruido: ${skippedEmpty}, Duplicados: ${skippedDuplicates}`,
      );

      return {
        status: 'success',
        processed,
        skippedEmpty,
        skippedDuplicates,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Fallo en la sincronización: ${message}`);
      return {
        status: 'failed',
        processed: 0,
        skippedEmpty: 0,
        skippedDuplicates: 0,
        error: message,
      };
    }
  }
}
