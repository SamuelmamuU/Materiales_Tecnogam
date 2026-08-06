-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "proyectos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "fecha_inicio" DATETIME NOT NULL,
    "fecha_fin_estimada" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "miembros_proyecto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuario_id" TEXT NOT NULL,
    "proyecto_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "miembros_proyecto_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "miembros_proyecto_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "hitos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "fecha_objetivo" DATETIME NOT NULL,
    "estatus" TEXT NOT NULL DEFAULT 'pendiente',
    "proyecto_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "hitos_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "materiales_cotizados" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proyecto_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "cantidad" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "materiales_cotizados_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "materiales_cotizados_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiales" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "materiales_capturados" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proyecto_id" TEXT NOT NULL,
    "material_id" TEXT,
    "material_manual" TEXT,
    "cantidad" REAL NOT NULL,
    "fecha" DATETIME NOT NULL,
    "latitud" REAL,
    "longitud" REAL,
    "evidencia_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "materiales_capturados_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "materiales_capturados_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiales" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "materiales_extras" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proyecto_id" TEXT NOT NULL,
    "material_manual" TEXT NOT NULL,
    "cantidad" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "materiales_extras_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "declaraciones_materiales" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proyecto_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "cantidad" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "declaraciones_materiales_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "declaraciones_materiales_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiales" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "avances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proyecto_id" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "frente" TEXT NOT NULL,
    "autor_id" TEXT NOT NULL,
    "latitud" REAL,
    "longitud" REAL,
    "evidencia_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "avances_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "avances_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "avance_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "avance_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "subtipo" TEXT,
    "material_id" TEXT,
    "material_manual" TEXT,
    "cantidad" REAL NOT NULL,
    CONSTRAINT "avance_items_avance_id_fkey" FOREIGN KEY ("avance_id") REFERENCES "avances" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "avance_items_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiales" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "incidentes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proyecto_id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "latitud" REAL,
    "longitud" REAL,
    "evidencia_url" TEXT,
    "estatus" TEXT NOT NULL DEFAULT 'abierto',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "incidentes_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tiempos_muertos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proyecto_id" TEXT NOT NULL,
    "frente" TEXT NOT NULL,
    "causa" TEXT NOT NULL,
    "duracion" REAL NOT NULL,
    "fecha" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tiempos_muertos_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bitacora_sincronizaciones" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dispositivo_id" TEXT,
    "tipo" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estatus" TEXT NOT NULL,
    "detalles" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "miembros_proyecto_usuario_id_proyecto_id_key" ON "miembros_proyecto"("usuario_id", "proyecto_id");

-- CreateIndex
CREATE UNIQUE INDEX "materiales_cotizados_proyecto_id_material_id_key" ON "materiales_cotizados"("proyecto_id", "material_id");
