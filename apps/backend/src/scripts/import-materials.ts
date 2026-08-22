import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
  Diamond: 'Diamond',
  Grade: 'Grade',
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

function cleanString(str: string): string {
  let cleaned = str;
  for (const [bad, good] of Object.entries(CORRUPT_WORDS_MAP)) {
    cleaned = cleaned.split(bad).join(good);
  }
  // Replace any leftover isolated replacement characters
  cleaned = cleaned.replace(/\uFFFD/g, '');
  return cleaned;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function main() {
  const csvPath = path.join(
    __dirname,
    '../../../../docs/BD Materiales - RBD.csv',
  );
  console.log(`Leyendo catálogo de materiales desde: ${csvPath}`);

  if (!fs.existsSync(csvPath)) {
    console.error(
      'Error: El archivo de materiales no existe en la ruta especificada.',
    );
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length <= 1) {
    console.error('El archivo CSV está vacío.');
    process.exit(1);
  }

  const headers = parseCSVLine(lines[0]);
  console.log('Columnas CSV:', headers);

  let importedCount = 0;
  let skippedEmptyCount = 0;
  let skippedDuplicateCount = 0;

  const uniqueCodigos = new Set<string>();
  const batchData: Array<{
    codigo: string;
    descripcion: string;
    unidad: string;
    categoria: string;
    activo: boolean;
  }> = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 5) {
      skippedEmptyCount++;
      continue;
    }

    const rawTipo = row[0]; // tipo -> categoria
    const rawUnidad = row[1]; // unidad -> unidad
    const rawDescripcion = row[3]; // descripcion -> descripcion
    const rawModelo = row[4]; // modelo -> codigo

    // Si los tres campos clave están vacíos, se considera fila vacía / ruido
    if (!rawModelo && !rawDescripcion && !rawUnidad) {
      skippedEmptyCount++;
      continue;
    }

    // Si falta alguno de los campos pero otros están presentes (no debería pasar según auditoría)
    if (!rawModelo || !rawDescripcion || !rawUnidad) {
      console.warn(
        `Línea ${i + 1}: Faltan campos clave (Modelo: "${rawModelo}", Desc: "${rawDescripcion}", Unidad: "${rawUnidad}"). Fila descartada.`,
      );
      skippedEmptyCount++;
      continue;
    }

    const codigo = cleanString(rawModelo);
    const descripcion = cleanString(rawDescripcion);
    const unidad = cleanString(rawUnidad);
    const categoria = cleanString(rawTipo);

    // Control de duplicados en memoria
    if (uniqueCodigos.has(codigo)) {
      skippedDuplicateCount++;
      continue;
    }

    uniqueCodigos.add(codigo);
    batchData.push({
      codigo,
      descripcion,
      unidad,
      categoria,
      activo: true,
    });
  }

  console.log('\n--- Resumen de Procesamiento de CSV ---');
  console.log(`Total de filas leídas: ${lines.length - 1}`);
  console.log(`Filas válidas listas para importar: ${batchData.length}`);
  console.log(`Filas vacías/ruido omitidas: ${skippedEmptyCount}`);
  console.log(
    `Registros duplicados omitidos en memoria: ${skippedDuplicateCount}`,
  );

  console.log('\nInsertando registros en la base de datos...');

  // Realizar inserción masiva (o uno por uno si es necesario para evitar colisiones en la BD)
  // Utilizaremos transacciones en lotes de 100 para eficiencia
  const batchSize = 100;
  for (let i = 0; i < batchData.length; i += batchSize) {
    const currentBatch = batchData.slice(i, i + batchSize);

    await prisma.$transaction(
      currentBatch.map((item) =>
        prisma.material.upsert({
          where: { codigo: item.codigo },
          update: {
            descripcion: item.descripcion,
            unidad: item.unidad,
            categoria: item.categoria,
            activo: item.activo,
          },
          create: item,
        }),
      ),
    );

    importedCount += currentBatch.length;
    if (importedCount % 500 === 0 || importedCount === batchData.length) {
      console.log(
        `Procesados ${importedCount} / ${batchData.length} registros...`,
      );
    }
  }

  const totalInDb = await prisma.material.count();
  console.log('\n--- Proceso ETL Finalizado con Éxito ---');
  console.log(`Registros insertados/actualizados (upsert): ${importedCount}`);
  console.log(`Total de materiales en base de datos: ${totalInDb}`);
}

main()
  .catch((err) => {
    console.error('Fallo en el script ETL de importación:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
