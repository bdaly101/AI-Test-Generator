import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative, extname } from 'path';
import { logger } from './logger.js';

export interface FileInfo {
  path: string;
  content: string;
  size: number;
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
    logger.debug(`Created directory: ${dirPath}`);
  }
}

/**
 * Read a file and return its content
 */
export function readFile(filePath: string): string {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch (error) {
    logger.error(`Failed to read file ${filePath}:`, error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Write content to a file, creating directories if needed
 */
export function writeFile(filePath: string, content: string): void {
  try {
    const dir = dirname(filePath);
    ensureDir(dir);
    writeFileSync(filePath, content, 'utf-8');
    logger.debug(`Written file: ${filePath}`);
  } catch (error) {
    logger.error(`Failed to write file ${filePath}:`, error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Check if a file exists
 */
export function fileExists(filePath: string): boolean {
  return existsSync(filePath);
}

/**
 * Get all files matching a pattern recursively
 */
export function findFiles(
  dir: string,
  pattern: RegExp,
  excludePatterns: RegExp[] = []
): string[] {
  const files: string[] = [];

  if (!existsSync(dir)) {
    return files;
  }

  function traverse(currentDir: string): void {
    try {
      const entries = readdirSync(currentDir);

      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        const stat = statSync(fullPath);

        // Skip if matches exclude pattern
        if (excludePatterns.some(pattern => pattern.test(fullPath))) {
          continue;
        }

        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (stat.isFile() && pattern.test(entry)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      logger.warn(`Failed to traverse directory ${currentDir}:`, error instanceof Error ? error.message : error);
    }
  }

  traverse(dir);
  return files;
}

/**
 * Get relative path from base to target
 */
export function getRelativePath(from: string, to: string): string {
  return relative(from, to);
}

/**
 * Check if a path is a TypeScript/JavaScript file
 */
export function isSourceFile(filePath: string): boolean {
  const ext = extname(filePath);
  return ['.ts', '.tsx', '.js', '.jsx'].includes(ext);
}

/**
 * Check if a path is a test file
 */
export function isTestFile(filePath: string): boolean {
  const name = filePath.toLowerCase();
  return name.includes('.test.') || name.includes('.spec.') || name.includes('__tests__');
}

/**
 * Get file extension
 */
export function getFileExtension(filePath: string): string {
  return extname(filePath).slice(1); // Remove the dot
}

/**
 * Get file name without extension
 */
export function getFileNameWithoutExt(filePath: string): string {
  const baseName = filePath.split('/').pop() || filePath;
  const ext = extname(baseName);
  return baseName.slice(0, -ext.length);
}

