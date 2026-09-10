import {
  Injectable,
  OnModuleInit,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);
  private s3Client!: S3Client;
  private bucketName!: string;

  async onModuleInit() {
    const endpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
    const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
    const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';
    this.bucketName = process.env.MINIO_BUCKET || 'evidencias';

    this.s3Client = new S3Client({
      endpoint,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      region: 'us-east-1', // Requerido por AWS SDK, aunque MinIO lo ignora
      forcePathStyle: true, // Requerido para MinIO
    });

    await this.ensureBucketExists();
  }

  private async ensureBucketExists() {
    try {
      // Verificar si el bucket existe
      await this.s3Client.send(
        new HeadBucketCommand({ Bucket: this.bucketName }),
      );
      this.logger.log(`Bucket de MinIO "${this.bucketName}" ya existe.`);
    } catch {
      this.logger.log(`El bucket "${this.bucketName}" no existe. Creándolo...`);
      try {
        // Crear bucket
        await this.s3Client.send(
          new CreateBucketCommand({ Bucket: this.bucketName }),
        );

        // Establecer política pública de lectura para que las imágenes puedan visualizarse en la web/móvil
        const publicPolicy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        };

        await this.s3Client.send(
          new PutBucketPolicyCommand({
            Bucket: this.bucketName,
            Policy: JSON.stringify(publicPolicy),
          }),
        );

        this.logger.log(
          `Bucket "${this.bucketName}" creado con política de lectura pública.`,
        );
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `MinIO no disponible en inicio (${errorMessage}). El servicio utilizará Data URI Base64 como respaldo.`,
        );
      }
    }
  }

  async uploadFile(
    file: Express.Multer.File,
  ): Promise<{ url: string; key: string }> {
    if (!file) {
      throw new BadRequestException('Archivo no proporcionado.');
    }

    const extension = file.originalname.split('.').pop() || '';
    if (
      !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension.toLowerCase())
    ) {
      throw new BadRequestException(
        'Tipo de archivo no permitido. Solo se permiten imágenes.',
      );
    }

    const key = `${randomUUID()}.${extension}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      // Endpoint público para descarga directa si MinIO está configurado
      const endpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
      const url = `${endpoint}/${this.bucketName}/${key}`;

      return { url, key };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `MinIO no disponible o error de conexión (${errorMessage}). Guardando como Data URI Base64 seguro.`,
      );
      // Fallback: Retorna un Data URI en Base64.
      // Es 100% compatible con navegadores, apps móviles y la base de datos PostgreSQL.
      const base64 = file.buffer.toString('base64');
      const url = `data:${file.mimetype};base64,${base64}`;
      return { url, key };
    }
  }
}
