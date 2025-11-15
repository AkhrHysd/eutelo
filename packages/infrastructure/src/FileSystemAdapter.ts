import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

type NodeFsError = Error & { code?: string };

export class FileSystemAdapter {
  async exists(targetPath: string): Promise<boolean> {
    try {
      await access(targetPath);
      return true;
    } catch (error) {
      const nodeError = error as NodeFsError;
      if (nodeError && nodeError.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  async mkdirp(targetPath: string): Promise<string> {
    await mkdir(targetPath, { recursive: true });
    return targetPath;
  }

  async writeIfNotExists(targetPath: string, content: string): Promise<{ written: boolean; skipped: boolean }> {
    const dir = path.dirname(targetPath);
    await mkdir(dir, { recursive: true });
    try {
      await writeFile(targetPath, content, { flag: 'wx' });
      return { written: true, skipped: false };
    } catch (error) {
      const nodeError = error as NodeFsError;
      if (nodeError && nodeError.code === 'EEXIST') {
        return { written: false, skipped: true };
      }
      throw error;
    }
  }
}
