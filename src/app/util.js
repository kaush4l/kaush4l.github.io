import fs from "fs";
import path from "path";

export default function Files({ params }) {
  const baseDir = 'public/components';
  const directories = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const filesMap = {};

  directories.forEach(directory => {
    const dirPath = path.join(baseDir, directory);
    const files = fs.readdirSync(dirPath).filter(file => fs.statSync(path.join(dirPath, file)).isFile() && file.endsWith('.md'));
    filesMap[directory] = files.map(file => ({
      name: file,
      content: fs.readFileSync(path.join(dirPath, file), 'utf-8')
    }));
  });

  return filesMap;
}