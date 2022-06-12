import os from 'os';
import path from 'path';
import { readdir, appendFile, rename, unlink, readFile } from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { getExistedConcatedAbsolutePathWithoutCommand } from "./utils/getExistedConcatedAbsolutePathWithoutCommand.js";
import { getDirOrFileTypeByAbsPath } from "./utils/getDirOrFileTypeByAbsPath.js";
import { getWordWithCapitalFirstLetter } from "./utils/getWordWithCapitalFirstLetter.js";
import { Transform } from 'stream';
import { isFileExists } from "./utils/isFileExists.js";
import { createBrotliDecompress, createBrotliCompress } from 'zlib';


export const fileManager = async () => {

  const args = process.argv;
  const usernameArg = args
    .slice(2)
    .find(arg => arg.startsWith('--username='));

  let username;

  if (!usernameArg || usernameArg.slice(11).length === 0) {
    console.log('Invalid input. Program was stopped.')
    process.exit(0);
  }

  username = getWordWithCapitalFirstLetter(usernameArg.slice(11));

  console.log(`Welcome to the File Manager, ${username}!`)

  const homeDirPath = os.homedir();

  let currentPath = homeDirPath;

  console.log(`You are currently in ${homeDirPath}`);

  class ExtendedTransform extends Transform {
    constructor() {
      super();
    }

    async _transform(chunk, encoding, callback) {
      const chunkStringified = chunk.toString().trim();
      if (chunkStringified.match('ls')) {
        this.pause();
        try {
          const files = await readdir(currentPath);
          this.resume();
          files.map(file => this.push(file + os.EOL));
        } catch (e) {
          this.resume();
          this.push('Operation failed' + os.EOL);
        }
        this.push(`You are currently in ${currentPath}` + os.EOL);
      } else if (chunkStringified.match('up')) {
        this.pause();
        if (currentPath !== homeDirPath) {
          const currentFileOrDirName = path.basename(currentPath);
          currentPath = currentPath.slice(0, currentPath.length - currentFileOrDirName.length - 1);
        }
        this.resume();
        this.push(`You are currently in ${currentPath}` + os.EOL);
      } else if (chunkStringified.startsWith('cd ')) {
        this.pause();
        try {
          currentPath = await getExistedConcatedAbsolutePathWithoutCommand(currentPath, chunkStringified, 3);
          this.resume();
        } catch (e) {
          this.resume();
          this.push('Operation failed' + os.EOL);
        }

        if (getDirOrFileTypeByAbsPath(currentPath) === 'directory') {
          this.push(`You are currently in ${currentPath}` + os.EOL);
        } else {
          this.push('Operation failed' + os.EOL);
          this.push(`You are currently in ${currentPath}` + os.EOL);
        }
      } else if (chunkStringified.startsWith('cat ')) {
        this.pause();
        try {
          const fileToReadPath = await getExistedConcatedAbsolutePathWithoutCommand(currentPath, chunkStringified, 4);
          if (getDirOrFileTypeByAbsPath(fileToReadPath) === 'file') {
            const readableStream = await createReadStream(fileToReadPath);
            this.resume();
            readableStream.on('data', (chunk) => {
              this.push(chunk.toString());
            });
          } else {
            this.push('Operation failed' + os.EOL);
          }
        } catch (e) {
          this.resume();
          this.push('Operation failed' + os.EOL);
        }
        this.push(`You are currently in ${currentPath}` + os.EOL);
      } else if (chunkStringified.startsWith('add ')) {
        this.pause();
        try {
          const fileToCreatePath = path.join(currentPath, chunkStringified.slice(4));
          await appendFile(fileToCreatePath, '', {
            flag: 'wx',
            encoding: 'utf8',
          });
          this.resume();
        } catch (e) {
          this.resume();
          this.push('Operation failed' + os.EOL);
        }
        this.push(`You are currently in ${currentPath}` + os.EOL);
      } else if (chunkStringified.startsWith('rn ')) {
        this.pause();
        try {
          const [pathToFileToRename, newFileName] = chunkStringified.slice(3).split(' ');

          const resultPathToFileToRename = await getExistedConcatedAbsolutePathWithoutCommand(currentPath, pathToFileToRename, 0);

          let resultNewFileNamePath;
          if (newFileName.startsWith(currentPath.slice(0, 3))) {
            resultNewFileNamePath = newFileName;
          } else {
            resultNewFileNamePath = path.join(currentPath.trim(), newFileName.trim());
          }

          const isResultNewFileNamePathExists = await isFileExists(resultNewFileNamePath);

          if (isResultNewFileNamePathExists) {
            throw new Error('');
          } else {
            await rename(resultPathToFileToRename, resultNewFileNamePath);
            this.resume();
          }
        } catch (e) {
          this.resume();
          this.push('Operation failed' + os.EOL);
        }
        this.push(`You are currently in ${currentPath}` + os.EOL);
      } else if (chunkStringified.startsWith('rm ')) {
        this.pause();
        try {
          const filePathToRemove = await getExistedConcatedAbsolutePathWithoutCommand(currentPath, chunkStringified, 3);
          await unlink(filePathToRemove);
          this.resume();
        } catch (e) {
          this.resume();
          this.push('Operation failed' + os.EOL);
        }
        this.push(`You are currently in ${currentPath}` + os.EOL);
      } else if (chunkStringified.startsWith('cp ')) {
        try {
          this.pause()
          const [pathToFile, pathToDestinationDirectory] = chunkStringified.slice(3).split(' ');

          const resultPathToFile = await getExistedConcatedAbsolutePathWithoutCommand(currentPath, pathToFile, 0);
          const resultPathToFileToDestinationDirectory = await getExistedConcatedAbsolutePathWithoutCommand(currentPath, pathToDestinationDirectory, 0);

          const destinationPathFile = path.join(resultPathToFileToDestinationDirectory, path.basename(resultPathToFile));

          const isFileExistsInDestination = await isFileExists(destinationPathFile);

          if (!isFileExistsInDestination) {
            await appendFile(destinationPathFile, '');
            createReadStream(resultPathToFile)
              .pipe(createWriteStream(destinationPathFile))
          } else {
            throw new Error('');
          }
          this.resume();
        } catch (e) {
          this.resume();
          this.push('Operation failed' + os.EOL);
        }
        this.push(`You are currently in ${currentPath}` + os.EOL);
      } else if (chunkStringified.startsWith('mv ')) {
        try {
          this.pause()
          const [pathToFile, pathToDestinationDirectory] = chunkStringified.slice(3).split(' ');

          const resultPathToFile = await getExistedConcatedAbsolutePathWithoutCommand(currentPath, pathToFile, 0);
          const resultPathToFileToDestinationDirectory = await getExistedConcatedAbsolutePathWithoutCommand(currentPath, pathToDestinationDirectory, 0);

          const destinationPathFile = path.join(resultPathToFileToDestinationDirectory, path.basename(resultPathToFile));

          const isFileExistsInDestination = await isFileExists(destinationPathFile);

          if (!isFileExistsInDestination) {
            await appendFile(destinationPathFile, '');

            const writeStream = createWriteStream(destinationPathFile);

            createReadStream(resultPathToFile)
              .pipe(writeStream);

          } else {
            throw new Error('');
          }
          this.resume();
        } catch (e) {
          this.resume();
          this.push('Operation failed' + os.EOL);
        }
        this.push(`You are currently in ${currentPath}` + os.EOL);
      } else if (chunkStringified.startsWith('hash ')) {
        try {
          this.pause();
          const fileToHashPath = await getExistedConcatedAbsolutePathWithoutCommand(currentPath, chunkStringified, 5);

          if (getDirOrFileTypeByAbsPath(fileToHashPath) === 'file') {
            const {createHash} = await import('crypto');
            const hashObj = createHash('sha256');
            const contents = await readFile(fileToHashPath, 'utf8');
            const hash = await hashObj.update(contents, 'utf8').digest('hex');
            this.resume();
            this.push(hash + os.EOL);
          } else {
            this.resume();
            this.push('Operation failed' + os.EOL);
          }
        } catch (e) {
          this.resume();
          this.push('Operation failed' + os.EOL);
        }

        this.push(`You are currently in ${currentPath}` + os.EOL);
      } else if (chunkStringified.startsWith('compress ')) {
        try {
          this.pause();
          const [pathToFile, pathToDestination] = chunkStringified.slice(9).split(' ');
          const fileToCompressPath = await getExistedConcatedAbsolutePathWithoutCommand(currentPath, pathToFile, 0);

          let resultPathToDestination;
          if (pathToDestination.startsWith(currentPath.slice(0, 3))) {
            resultPathToDestination = pathToDestination;
          } else {
            resultPathToDestination = path.join(currentPath.trim(), pathToDestination.trim());
          }

          const isResultNewFileNamePathExists = await isFileExists(resultPathToDestination);

          if (isResultNewFileNamePathExists
            || getDirOrFileTypeByAbsPath(resultPathToDestination) === 'directory'
            || getDirOrFileTypeByAbsPath(fileToCompressPath) === 'directory'
          ) {
            throw new Error('');
          } else {
            createReadStream(fileToCompressPath)
              .pipe(createBrotliCompress())
              .pipe(createWriteStream(resultPathToDestination));
            this.resume();
          }
        } catch (e) {
          this.resume();
          this.push('Operation failed' + os.EOL);
        }
        this.push(`You are currently in ${currentPath}` + os.EOL);
      } else if (chunkStringified.startsWith('decompress ')) {
        try {
          this.pause();
          const [pathToFile, pathToDestination] = chunkStringified.slice(11).split(' ');
          const fileToCompressPath = await getExistedConcatedAbsolutePathWithoutCommand(currentPath, pathToFile, 0);

          let resultPathToDestination;
          if (pathToDestination.startsWith(currentPath.slice(0, 3))) {
            resultPathToDestination = pathToDestination;
          } else {
            resultPathToDestination = path.join(currentPath.trim(), pathToDestination.trim());
          }

          const isResultNewFileNamePathExists = await isFileExists(resultPathToDestination);

          if (isResultNewFileNamePathExists
            || getDirOrFileTypeByAbsPath(resultPathToDestination) === 'directory'
            || getDirOrFileTypeByAbsPath(fileToCompressPath) === 'directory'
          ) {
            throw new Error('');
          } else {
            createReadStream(fileToCompressPath)
              .pipe(createBrotliDecompress())
              .pipe(createWriteStream(resultPathToDestination));
            this.resume();
          }
        } catch (e) {
          this.resume();
          this.push('Operation failed' + os.EOL);
        }
        this.push(`You are currently in ${currentPath}` + os.EOL);
      } else if (chunkStringified === 'os --homedir') {
        this.push(homeDirPath + os.EOL);
        this.push(`You are currently in ${currentPath}` + os.EOL);
      } else if (chunkStringified === 'os --EOL') {
        this.push(JSON.stringify(os.EOL) + os.EOL);
        this.push(`You are currently in ${currentPath}` + os.EOL);
      } else if (chunkStringified === 'os --cpus') {
        const cpus = os.cpus();
        const briefInfo = `${cpus.length} ${cpus[0].model}`;
        this.push(briefInfo + os.EOL);
        this.push(`You are currently in ${currentPath}` + os.EOL);
      } else if (chunkStringified === 'os --username') {
        this.push(os.userInfo('utf8').username + os.EOL);
        this.push(`You are currently in ${currentPath}` + os.EOL);
      } else if (chunkStringified === 'os --architecture') {
        this.push(os.arch() + os.EOL);
        this.push(`You are currently in ${currentPath}` + os.EOL);
      } else if (chunkStringified === '.exit') {
        this.push(`Thank you for using File Manager, ${username}!` + os.EOL);
        setTimeout(() => {
          this.end()
        }, 0);
      } else {
        this.push('Invalid input' + os.EOL);
      }

      callback();
    }
  }

  const transformStreamFromConsole = new ExtendedTransform();

  process.stdin
    .pipe(transformStreamFromConsole)
    .pipe(process.stdout);
};


fileManager();