import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { hashPassword } from '../src/common/utils/crypto';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Iniciando el sembrado de la base de datos (Seed)...');

  // 1. Crear usuarios para cada rol
  const passAdmin = hashPassword('admin123');
  const passSuper = hashPassword('super123');
  const passTrab = hashPassword('trabajador123');
  const passCli = hashPassword('cliente123');

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@tecnogam.com' },
    update: {},
    create: {
      email: 'admin@tecnogam.com',
      nombre: 'Administrador Tecnogam',
      password: passAdmin,
      rol: 'administrador',
      activo: true,
    },
  });
  console.log('Usuario administrador creado:', admin.email);

  const supervisor = await prisma.usuario.upsert({
    where: { email: 'supervisor@tecnogam.com' },
    update: {},
    create: {
      email: 'supervisor@tecnogam.com',
      nombre: 'Ana Torres',
      password: passSuper,
      rol: 'supervisor',
      activo: true,
    },
  });
  console.log('Usuario supervisor creado:', supervisor.email);

  const trabajador = await prisma.usuario.upsert({
    where: { email: 'trabajador@tecnogam.com' },
    update: {},
    create: {
      email: 'trabajador@tecnogam.com',
      nombre: 'Luis Peña',
      password: passTrab,
      rol: 'trabajador',
      activo: true,
    },
  });
  console.log('Usuario trabajador creado:', trabajador.email);

  const cliente = await prisma.usuario.upsert({
    where: { email: 'cliente@tecnogam.com' },
    update: {},
    create: {
      email: 'cliente@tecnogam.com',
      nombre: 'Grupo Vega Rep',
      password: passCli,
      rol: 'cliente',
      activo: true,
    },
  });
  console.log('Usuario cliente creado:', cliente.email);

  // 2. Crear proyecto base (según mockup y requerimientos)
  const proyecto = await prisma.proyecto.create({
    data: {
      nombre: 'Torre Norte - Fase 2',
      cliente: 'Grupo Vega',
      fechaInicio: new Date('2026-08-01T00:00:00Z'),
      fechaFinEstimada: new Date('2027-02-15T00:00:00Z'),
    },
  });
  console.log('Proyecto creado:', proyecto.nombre, `(ID: ${proyecto.id})`);

  // 3. Asignar miembros al proyecto
  await prisma.memberProyecto.createMany({
    data: [
      { usuarioId: supervisor.id, proyectoId: proyecto.id },
      { usuarioId: trabajador.id, proyectoId: proyecto.id },
      { usuarioId: cliente.id, proyectoId: proyecto.id },
    ],
  });
  console.log('Miembros asignados al proyecto.');

  // 4. Crear Hitos del Proyecto (según mockup)
  await prisma.hito.createMany({
    data: [
      {
        nombre: 'Levantamiento e ingeniería',
        fechaObjetivo: new Date('2026-08-30T00:00:00Z'),
        estatus: 'pendiente',
        proyectoId: proyecto.id,
      },
      {
        nombre: 'Instalación nivel 1-4',
        fechaObjetivo: new Date('2026-11-15T00:00:00Z'),
        estatus: 'pendiente',
        proyectoId: proyecto.id,
      },
      {
        nombre: 'Entrega final',
        fechaObjetivo: new Date('2027-02-15T00:00:00Z'),
        estatus: 'pendiente',
        proyectoId: proyecto.id,
      },
    ],
  });
  console.log('Hitos del proyecto creados.');

  // 5. Garantizar que existan los materiales clave del mockup e importarlos como cotizados
  // Si no existen, los creamos
  const matDucto = await prisma.material.upsert({
    where: { codigo: 'DG-1200' },
    update: {},
    create: {
      codigo: 'DG-1200',
      descripcion: 'Ducto galvanizado 12"',
      unidad: 'ml',
      categoria: 'CHAROLAS Y ACCESORIOS',
      activo: true,
    },
  });

  const matAislamiento = await prisma.material.upsert({
    where: { codigo: 'AT-0450' },
    update: {},
    create: {
      codigo: 'AT-0450',
      descripcion: 'Aislamiento térmico 2"',
      unidad: 'm2',
      categoria: 'ACCESORIOS Y CONSUMIBLES',
      activo: true,
    },
  });

  const matValvula = await prisma.material.upsert({
    where: { codigo: 'VL-2210' },
    update: {},
    create: {
      codigo: 'VL-2210',
      descripcion: 'Válvula de compuerta 4"',
      unidad: 'pza',
      categoria: 'GABINETES Y COMPONENTES',
      activo: true,
    },
  });

  // Asociar materiales cotizados (cantidades del mockup: Ducto=1800, Aislamiento=960, Valvula=12)
  await prisma.materialCotizado.createMany({
    data: [
      { proyectoId: proyecto.id, materialId: matDucto.id, cantidad: 1800 },
      { proyectoId: proyecto.id, materialId: matAislamiento.id, cantidad: 960 },
      { proyectoId: proyecto.id, materialId: matValvula.id, cantidad: 12 },
    ],
  });
  console.log('Materiales cotizados vinculados al proyecto.');

  // Crear declaraciones de materiales iniciales (Estados para el cliente)
  await prisma.declaracionMaterial.createMany({
    data: [
      {
        proyectoId: proyecto.id,
        materialId: matDucto.id,
        estado: 'declarado_cliente',
        cantidad: 1800,
      },
      {
        proyectoId: proyecto.id,
        materialId: matAislamiento.id,
        estado: 'declarado_cliente',
        cantidad: 960,
      },
      {
        proyectoId: proyecto.id,
        materialId: matValvula.id,
        estado: 'declarado_cliente',
        cantidad: 12,
      },
    ],
  });
  console.log('Declaraciones iniciales creadas.');
  console.log('Sembrado finalizado exitosamente.');
}

main()
  .catch(err => {
    console.error('Fallo en el sembrado de base de datos:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
