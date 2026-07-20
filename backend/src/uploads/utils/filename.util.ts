const MOJIBAKE_PATTERN = /[ÃÂâ�]/;

export function normalizeUploadedFilename(filename: string): string {
  if (!filename || !MOJIBAKE_PATTERN.test(filename)) {
    return filename;
  }

  try {
    const decoded = Buffer.from(filename, 'latin1').toString('utf8');
    return decoded.includes('�') ? filename : decoded;
  } catch {
    return filename;
  }
}
