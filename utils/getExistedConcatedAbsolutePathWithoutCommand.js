import { isFileExists } from "./isFileExists.js";
import path from 'path';

export const getExistedConcatedAbsolutePathWithoutCommand = async (currentPath, inputPath, sliceCount) => {
  let resultPath;

  const absolutePath = inputPath.slice(sliceCount).trim();
  const relativePath = path.join(currentPath.trim(), inputPath.slice(sliceCount).trim());

  const isAbsolutePathFileExists = await isFileExists(absolutePath);
  const isRelativePathFileExists = await isFileExists(relativePath);

  if (isAbsolutePathFileExists) {
    resultPath = absolutePath;
  } else if (isRelativePathFileExists) {
    resultPath = relativePath;
  } else {
    throw new Error('');
  }

  return resultPath;
};