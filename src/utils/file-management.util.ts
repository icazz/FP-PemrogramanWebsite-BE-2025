import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';

export abstract class FileManager {
  /**
   * Fungsi Upload File
   * @param {string} file_folder_path lokasi upload file dengan format /uploads/{file_folder_path}/{filename}
   * @param {File} file file yang mau diupload
   */
  static async upload(file_folder_path: string, file: File) {
    let cleaned = path.parse(file.name).name.replaceAll(/[^\w -]/g, '');
    cleaned = cleaned.replaceAll(/\s+/g, '_');

    const timestamp = Date.now();
    const newFileName = `${cleaned}_${timestamp}`;
    const newFilePath = `uploads/${file_folder_path}/${newFileName}${path.extname(file.name)}`;

    await Bun.write(`./${newFilePath}`, file, { createPath: true });

    return newFilePath;
  }

  static async remove(file_path?: string | null) {
    if (!file_path) return;
    if (!existsSync(`./${file_path}`)) return;

    const file = Bun.file(`./${file_path}`);
    await file.delete();
  }

  static async removeFolder(folder_path: string) {
    if (!existsSync(folder_path)) return;
    await rm(folder_path, { recursive: true, force: true });
  }
}
