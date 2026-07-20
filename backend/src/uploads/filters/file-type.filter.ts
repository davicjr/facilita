import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

export const imageFileFilter = (req: any, file: any, callback: any) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (!allowedMimes.includes(file.mimetype)) {
    return callback(
      new BadRequestException('Only image files are allowed (JPEG, PNG, GIF, WEBP)'),
      false,
    );
  }

  callback(null, true);
};

export const documentFileFilter = (req: any, file: any, callback: any) => {
  const mimeType = typeof file?.mimetype === 'string'
    ? file.mimetype.split(';')[0].trim().toLowerCase()
    : '';
  const extension = typeof file?.originalname === 'string'
    ? extname(file.originalname).toLowerCase()
    : '';
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    'text/x-markdown',
  ];
  const allowedExtensions = new Set([
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.txt',
    '.md',
  ]);
  const isMimeAllowed = allowedMimes.includes(mimeType);
  const isExtensionAllowed = allowedExtensions.has(extension);
  const shouldAllowByExtension =
    isExtensionAllowed &&
    (!mimeType || mimeType === 'application/octet-stream');

  if (!isMimeAllowed && !shouldAllowByExtension) {
    return callback(
      new BadRequestException(
        'Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, MD',
      ),
      false,
    );
  }

  callback(null, true);
};
