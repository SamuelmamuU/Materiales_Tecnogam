import * as fs from 'fs';
import * as path from 'path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  ImageRun,
  Footer,
  PageNumber,
} from 'docx';

async function generate() {
  console.log('Generando documento Word del instructivo...');

  // Cargar logo si existe
  const logoPath = path.resolve(__dirname, '../../../mobile/assets/images/TG.png');
  let logoBuffer: Buffer | null = null;
  if (fs.existsSync(logoPath)) {
    logoBuffer = fs.readFileSync(logoPath);
  }

  const borderNone = {
    top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  };

  const borderCallout = {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'E3E1D9' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E3E1D9' },
    left: { style: BorderStyle.SINGLE, size: 24, color: 'C55A11' }, // Barra naranja izquierda
    right: { style: BorderStyle.SINGLE, size: 4, color: 'E3E1D9' },
  };

  const borderWarning = {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'F5C6CB' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'F5C6CB' },
    left: { style: BorderStyle.SINGLE, size: 24, color: 'C23939' }, // Barra roja izquierda
    right: { style: BorderStyle.SINGLE, size: 4, color: 'F5C6CB' },
  };

  const borderStep = {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'E3E1D9' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E3E1D9' },
    left: { style: BorderStyle.SINGLE, size: 16, color: '1C1C1A' }, // Barra oscura izquierda
    right: { style: BorderStyle.SINGLE, size: 4, color: 'E3E1D9' },
  };

  const children: any[] = [];

  // Encabezado con Logo y Título de Empresa
  if (logoBuffer) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: {
              width: 110,
              height: 110,
            },
            type: 'png',
          }),
        ],
      })
    );
  }

  // Título Principal
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: 'TECNOGAM',
          bold: true,
          size: 36, // 18pt
          color: '1C1C1A',
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: 'SISTEMA DE CONTROL DE MATERIALES Y AVANCES DE OBRA',
          bold: true,
          size: 22, // 11pt
          color: 'C55A11',
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: 'INSTRUCTIVO DE INSTALACIÓN DE LA APLICACIÓN MÓVIL DESDE WHATSAPP',
          bold: true,
          size: 28, // 14pt
          color: '1C1C1A',
          font: 'Arial',
        }),
        new TextRun({
          text: '\nGuía paso a paso para teléfonos Android (Supervisores y Personal de Campo)',
          italics: true,
          size: 20, // 10pt
          color: '5F5E5A',
          font: 'Arial',
        }),
      ],
    })
  );

  // Cuadro de Aviso Importante
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: borderCallout,
              shading: { fill: 'FFF9F5', type: ShadingType.CLEAR, color: 'auto' },
              margins: { top: 140, bottom: 140, left: 180, right: 180 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '📌 NOTA IMPORTANTE PARA EL SUPERVISOR: ',
                      bold: true,
                      color: 'C55A11',
                      size: 20,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: 'Esta aplicación es una herramienta 100% oficial, privada y segura de Tecnogam. Como ha sido creada exclusivamente para la empresa y no proviene de la tienda pública de Google Play Store, tu teléfono Android te pedirá confirmar unos sencillos permisos de seguridad para poder instalarla. Sigue este instructivo con atención.',
                      size: 20,
                      color: '2E2E2C',
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 200 } })
  );

  // Función auxiliar para crear bloques de paso
  const createStepBox = (
    stepNumber: string,
    title: string,
    instructionItems: string[],
    note?: { text: string; isWarning?: boolean }
  ) => {
    const tableChildren: Paragraph[] = [
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: `${stepNumber}: `,
            bold: true,
            color: 'C55A11',
            size: 24,
            font: 'Arial',
          }),
          new TextRun({
            text: title,
            bold: true,
            color: '1C1C1A',
            size: 24,
            font: 'Arial',
          }),
        ],
      }),
    ];

    instructionItems.forEach((item, index) => {
      tableChildren.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: `${index + 1}. `,
              bold: true,
              color: '1C1C1A',
              size: 20,
              font: 'Arial',
            }),
            new TextRun({
              text: item,
              size: 20,
              color: '2E2E2C',
              font: 'Arial',
            }),
          ],
        })
      );
    });

    if (note) {
      tableChildren.push(
        new Paragraph({
          spacing: { before: 80, after: 40 },
          children: [
            new TextRun({
              text: note.isWarning ? '⚠️ ATENCIÓN: ' : '💡 CONSEJO: ',
              bold: true,
              color: note.isWarning ? 'C23939' : 'C55A11',
              size: 19,
              font: 'Arial',
            }),
            new TextRun({
              text: note.text,
              italics: true,
              color: note.isWarning ? '800000' : '5F5E5A',
              size: 19,
              font: 'Arial',
            }),
          ],
        })
      );
    }

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: note?.isWarning ? borderWarning : borderStep,
              shading: {
                fill: note?.isWarning ? 'FFF5F5' : 'FAF9F7',
                type: ShadingType.CLEAR,
                color: 'auto',
              },
              margins: { top: 120, bottom: 120, left: 160, right: 160 },
              children: tableChildren,
            }),
          ],
        }),
      ],
    });
  };

  // PASO 1
  children.push(
    createStepBox(
      'PASO 1',
      'Descargar el Archivo en WhatsApp',
      [
        'Abre la conversación de WhatsApp donde recibiste el archivo instalador.',
        'El archivo tiene el nombre "app-tecnogam-supervisor.apk". Verás un icono de flecha hacia abajo sobre el documento.',
        'Toca la flecha hacia abajo (⬇️) para que el archivo se descargue en tu teléfono móvil.',
        'Una vez que termine la descarga (desaparece la flecha y queda el icono de archivo), toca una vez sobre el archivo para abrirlo.',
      ],
      {
        text: 'Asegúrate de contar con conexión a Wi-Fi o datos móviles activos para completar la descarga del archivo (pesa aprox. 50 MB).',
      }
    ),
    new Paragraph({ spacing: { after: 160 } })
  );

  // PASO 2
  children.push(
    createStepBox(
      'PASO 2',
      'Habilitar el Permiso de Instalación para WhatsApp',
      [
        'Al tocar el archivo por primera vez, tu teléfono Android mostrará una ventana con el siguiente aviso: "Por motivos de seguridad, tu teléfono no tiene permitido instalar apps desconocidas de esta fuente" (o un texto muy similar).',
        'Toca el botón que dice "Configuración" o "Ajustes" que aparece en esa misma ventana.',
        'Se abrirá una lista de ajustes. Busca la opción que dice "Permitir desde esta fuente" o "Confiar en esta fuente".',
        'Toca la palanquita o interruptor para encenderlo (cambiará de color a azul o verde).',
        'Toca la flecha de regresar (⬅️) en la parte superior izquierda de tu pantalla para volver a WhatsApp.',
      ],
      {
        text: 'En teléfonos de marcas como Xiaomi, Redmi o POCO, podría aparecer un aviso de seguridad con una cuenta regresiva de 10 segundos. Solo debes marcar la casilla que dice "Soy consciente de los posibles riesgos..." y tocar "Aceptar". Esto es completamente normal.',
      }
    ),
    new Paragraph({ spacing: { after: 160 } })
  );

  // PASO 3
  children.push(
    createStepBox(
      'PASO 3',
      'Confirmar la Instalación de la Aplicación',
      [
        'Al volver de los ajustes, el teléfono te mostrará una ventana con el logo de Tecnogam y la pregunta: "¿Deseas instalar Tecnogam?".',
        'Toca el botón "Instalar" que se encuentra ubicado en la esquina inferior derecha.',
        'Espera unos segundos mientras se completa la barra de instalación.',
      ]
    ),
    new Paragraph({ spacing: { after: 160 } })
  );

  // PASO 4 (CRÍTICO: PLAY PROTECT)
  children.push(
    createStepBox(
      'PASO 4',
      'Aviso de Google Play Protect (MUY IMPORTANTE)',
      [
        'En muchos teléfonos Android, el sistema Google Play Protect mostrará una alerta en pantalla con título: "Bloqueada por Play Protect" o "App no reconocida".',
        '¡CUIDADO! NO toques el botón que dice "Entendido" ni "Aceptar", ya que eso cancelará la instalación.',
        'En su lugar, toca las letras pequeñas que dicen "Más detalles" (o la flechita hacia abajo 🔽).',
        'Al tocar "Más detalles", se desplegará un texto adicional con una opción que dice: "Instalar de todos modos" (o "Instalar de todas formas").',
        'Toca "Instalar de todos modos". La instalación continuará y finalizará en 3 segundos.',
      ],
      {
        text: 'Google muestra esta advertencia preventiva de forma automática con cualquier app privada que no esté publicada en la tienda pública comercial de Play Store. La app de Tecnogam es 100% segura y libre de cualquier código dañino.',
        isWarning: true,
      }
    ),
    new Paragraph({ spacing: { after: 160 } })
  );

  // PASO 5
  children.push(
    createStepBox(
      'PASO 5',
      'Abrir la App y Otorgar los Permisos de Operación en Campo',
      [
        'Una vez terminada la instalación, toca el botón "Abrir" (también encontrarás el acceso directo con el logo de Tecnogam en el menú de aplicaciones de tu teléfono).',
        'En el primer inicio, la aplicación te solicitará 2 permisos esenciales para el trabajo de campo:',
        '  a) Permiso de Ubicación (GPS): Selecciona la opción "Permitir solo mientras la app está en uso". Esto es obligatorio para registrar automáticamente las coordenadas y el frente de trabajo de cada avance.',
        '  b) Permiso de Cámara: Selecciona la opción "Permitir solo mientras la app está en uso". Esto es obligatorio para capturar y adjuntar las fotos de evidencia en las bitácoras diarias y reportes de paros/incidentes.',
      ],
      {
        text: 'Sin estos dos permisos, la app no podrá guardar las evidencias fotográficas ni validar los frentes de trabajo en las bitácoras.',
      }
    ),
    new Paragraph({ spacing: { after: 160 } })
  );

  // PASO 6
  children.push(
    createStepBox(
      'PASO 6',
      'Inicio de Sesión con Credenciales de Supervisor',
      [
        'En la pantalla principal verás el logotipo de Tecnogam y dos campos de texto.',
        'Escribe tu Correo Electrónico asignado (ej. supervisor@tecnogam.com).',
        'Escribe tu Contraseña.',
        'Toca el botón azul "Iniciar Sesión".',
        '¡Listo! Entrarás al Dashboard con el selector de proyectos, bitácora de avances, avances especializados (válvulas, instrumentos, motores) y el reporte de jornada laboral.',
      ],
      {
        text: 'La primera vez que inicias sesión, el servidor en la nube puede tardar de 20 a 30 segundos en despertar y validar tus accesos. Ten un poco de paciencia y no cierres la app.',
      }
    ),
    new Paragraph({ spacing: { after: 200 } })
  );

  // Tabla de Preguntas Frecuentes
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: '❓ PREGUNTAS FRECUENTES Y SOLUCIÓN RÁPIDA DE PROBLEMAS',
          bold: true,
          size: 24,
          color: '1C1C1A',
          font: 'Arial',
        }),
      ],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: borderCallout,
              shading: { fill: 'F1EFE8', type: ShadingType.CLEAR, color: 'auto' },
              margins: { top: 100, bottom: 100, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Problema / Pregunta',
                      bold: true,
                      size: 20,
                      color: '1C1C1A',
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: borderCallout,
              shading: { fill: 'F1EFE8', type: ShadingType.CLEAR, color: 'auto' },
              margins: { top: 100, bottom: 100, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Solución Inmediata',
                      bold: true,
                      size: 20,
                      color: '1C1C1A',
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              borders: borderStep,
              margins: { top: 100, bottom: 100, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Toco el archivo en WhatsApp y dice "No se puede abrir el archivo".',
                      bold: true,
                      size: 19,
                      color: '1C1C1A',
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: borderStep,
              margins: { top: 100, bottom: 100, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Abre la app de tu teléfono llamada "Mis Archivos", "Archivos" o "Files" (icono de carpeta). Entra a la carpeta "Descargas" o "WhatsApp Documents", busca el archivo app-tecnogam-supervisor.apk y tócalo directamente desde allí.',
                      size: 19,
                      color: '2E2E2C',
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              borders: borderStep,
              margins: { top: 100, bottom: 100, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Presioné por error "Entendido" en Play Protect y se canceló la instalación.',
                      bold: true,
                      size: 19,
                      color: '1C1C1A',
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: borderStep,
              margins: { top: 100, bottom: 100, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'No te preocupes. Vuelve al chat de WhatsApp, toca el archivo nuevamente para reiniciar la instalación y esta vez asegúrate de presionar "Más detalles" y luego "Instalar de todos modos".',
                      size: 19,
                      color: '2E2E2C',
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              borders: borderStep,
              margins: { top: 100, bottom: 100, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '¿Puedo usar la aplicación si no hay señal en una zona de la planta?',
                      bold: true,
                      size: 19,
                      color: '1C1C1A',
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: borderStep,
              margins: { top: 100, bottom: 100, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '¡Sí! La app cuenta con base de datos local SQLite para operar offline. Puedes capturar avances y fotos sin conexión; cuando tu teléfono vuelva a tener señal o Wi-Fi, la app sincronizará la información automáticamente con la nube.',
                      size: 19,
                      color: '2E2E2C',
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 200 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Tecnogam © 2026 — Sistema de Control de Materiales e Ingeniería',
          bold: true,
          size: 18,
          color: '8B8A84',
          font: 'Arial',
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1200,
              right: 1200,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'Instructivo Tecnogam — Página ',
                    size: 18,
                    color: '8B8A84',
                    font: 'Arial',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    color: '8B8A84',
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  // Guardar en docs/ y en apps/mobile/
  const targetDirDocs = path.resolve(__dirname, '../../../../docs');
  if (!fs.existsSync(targetDirDocs)) fs.mkdirSync(targetDirDocs, { recursive: true });
  const targetPathDocs = path.join(targetDirDocs, 'Instructivo_Instalacion_Tecnogam_WhatsApp.docx');
  fs.writeFileSync(targetPathDocs, buffer);
  console.log(`Documento Word generado en: ${targetPathDocs}`);

  const targetPathMobile = path.resolve(__dirname, '../../../mobile/Instructivo_Instalacion_Tecnogam_WhatsApp.docx');
  fs.writeFileSync(targetPathMobile, buffer);
  console.log(`Documento Word copiado a: ${targetPathMobile}`);

  const rootPath = path.resolve(__dirname, '../../../../Instructivo_Instalacion_Tecnogam_WhatsApp.docx');
  fs.writeFileSync(rootPath, buffer);
  console.log(`Documento Word copiado a la raíz: ${rootPath}`);
}

generate().catch((err) => {
  console.error('Error generando documento Word:', err);
  process.exit(1);
});
