import { stat } from 'fs/promises';

export async function isFileExists(path) {
  return !!(await stat(path).catch(() => false));
}