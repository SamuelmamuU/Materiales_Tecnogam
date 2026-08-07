/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { BadRequestException } from '@nestjs/common';

// Mock S3Client
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => {
      return {
        send: jest.fn().mockImplementation((command) => {
          // Mock head-bucket, create-bucket, put-policy, and put-object commands
          return Promise.resolve({});
        }),
      };
    }),
    PutObjectCommand: jest.fn(),
    CreateBucketCommand: jest.fn(),
    HeadBucketCommand: jest.fn(),
    PutBucketPolicyCommand: jest.fn(),
  };
});

describe('MediaService', () => {
  let service: MediaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MediaService],
    }).compile();

    service = module.get<MediaService>(MediaService);
    // Simular el ciclo de vida del módulo
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('debería rechazar si no se proporciona ningún archivo', async () => {
      await expect(service.uploadFile(null as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería rechazar si la extensión de archivo no es una imagen permitida', async () => {
      const mockFile = {
        originalname: 'documento.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('mock pdf content'),
      } as Express.Multer.File;

      await expect(service.uploadFile(mockFile)).rejects.toThrow(
        'Tipo de archivo no permitido. Solo se permiten imágenes.',
      );
    });

    it('debería subir con éxito una imagen válida', async () => {
      const mockFile = {
        originalname: 'foto_campo.png',
        mimetype: 'image/png',
        buffer: Buffer.from('mock image bytes'),
      } as Express.Multer.File;

      const result = await service.uploadFile(mockFile);

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
      expect(result.url).toContain('.png');
      expect(PutObjectCommand).toHaveBeenCalled();
    });
  });
});
