import { promises as fs } from 'node:fs';
import path from 'node:path';

type NodeFsError = Error & { code?: string };

export class FileSystemAdapter {
  async exists(targetPath: string): Promise<boolean> {
    try {
      await fs.access(targetPath);
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
    await fs.mkdir(targetPath, { recursive: true });
    return targetPath;
  }

  async writeIfNotExists(targetPath: string, content: string): Promise<{ written: boolean; skipped: boolean }> {
    const dir = path.dirname(targetPath);
    await fs.mkdir(dir, { recursive: true });
    try {
      await fs.writeFile(targetPath, content, { flag: 'wx' });
      return { written: true, skipped: false };
    } catch (error) {
      const nodeError = error as NodeFsError;
      if (nodeError && nodeError.code === 'EEXIST') {
        return { written: false, skipped: true };
      }
      throw error;
    }
  }

  async readDir(targetPath: string): Promise<string[]> {
    try {
      return await fs.readdir(targetPath);
    } catch (error) {
      const nodeError = error as NodeFsError;
      if (nodeError && nodeError.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async listDirectories(targetPath: string): Promise<string[]> {
    let entries: string[] = [];
    try {
      entries = await fs.readdir(targetPath);
    } catch (error) {
      const nodeError = error as NodeFsError;
      if (nodeError && nodeError.code === 'ENOENT') {
        return [];
      }
      throw error;
    }

    const directories: string[] = [];
    for (const entry of entries) {
      const entryPath = path.join(targetPath, entry);
      try {
        await fs.readdir(entryPath);
        directories.push(entry);
      } catch (error) {
        const nodeError = error as NodeFsError;
        if (nodeError && (nodeError.code === 'ENOTDIR' || nodeError.code === 'ENOENT')) {
          continue;
        }
        throw error;
      }
    }
    return directories;
  }
}
