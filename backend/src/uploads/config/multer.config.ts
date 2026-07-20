import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, isAbsolute, join, resolve } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { systemConfigStore } from '../../system-config/system-config.store';

const resolveUploadRoot = () => {
  const configured = systemConfigStore.getString('upload_directory', 'uploads');
  const value = configured.trim() || 'uploads';
  return isAbsolute(value) ? value : resolve(process.cwd(), value);
};

const ensureDir = (path: string) => {
  mkdirSync(path, { recursive: true });
};

const createStorage = (subdir?: string) =>
  diskStorage({
    destination: (_req, _file, callback) => {
      const root = resolveUploadRoot();
      const target = subdir ? join(root, subdir) : root;
      ensureDir(target);
      callback(null, target);
    },
    filename: (_req, file, callback) => {
      const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
      callback(null, uniqueName);
    },
  });

export const multerConfig = {
  storage: createStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
};

export const imageMulterConfig = {
  storage: createStorage('images'),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
};

export const documentMulterConfig = {
  storage: createStorage('documents'),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
};
