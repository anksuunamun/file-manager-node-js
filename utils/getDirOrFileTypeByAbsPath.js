import { extname } from 'path';

export const getDirOrFileTypeByAbsPath = (path) => {
  if (extname(path)) {
    return 'file';
  }
  return 'directory';
};