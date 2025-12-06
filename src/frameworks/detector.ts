import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';
import { findFiles } from '../utils/fs.js';

export type TestFramework = 'vitest' | 'jest' | 'auto';

export interface FrameworkInfo {
  framework: 'vitest' | 'jest';
  configPath?: string;
  detected: boolean;
}

/**
 * Detect which test framework is being used in the project
 */
export async function detectFramework(
  projectRoot: string = process.cwd(),
  preference: TestFramework = 'auto'
): Promise<FrameworkInfo> {
  // If preference is explicitly set, use it
  if (preference === 'vitest') {
    return { framework: 'vitest', detected: true };
  }
  if (preference === 'jest') {
    return { framework: 'jest', detected: true };
  }

  // Check package.json for dependencies
  const packageJsonPath = join(projectRoot, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      const hasVitest = deps.vitest || deps['vitest/globals'];
      const hasJest = deps.jest || deps['@jest/globals'];

      if (hasVitest && !hasJest) {
        logger.debug('Detected Vitest from package.json');
        return {
          framework: 'vitest',
          configPath: findConfigFile(projectRoot, 'vitest'),
          detected: true,
        };
      }

      if (hasJest && !hasVitest) {
        logger.debug('Detected Jest from package.json');
        return {
          framework: 'jest',
          configPath: findConfigFile(projectRoot, 'jest'),
          detected: true,
        };
      }

      if (hasVitest && hasJest) {
        logger.warn('Both Vitest and Jest found in package.json, defaulting to Vitest');
        return {
          framework: 'vitest',
          configPath: findConfigFile(projectRoot, 'vitest'),
          detected: true,
        };
      }
    } catch (error) {
      logger.warn('Failed to parse package.json:', error instanceof Error ? error.message : error);
    }
  }

  // Check for config files
  const vitestConfig = findConfigFile(projectRoot, 'vitest');
  if (vitestConfig) {
    logger.debug('Detected Vitest from config file');
    return {
      framework: 'vitest',
      configPath: vitestConfig,
      detected: true,
    };
  }

  const jestConfig = findConfigFile(projectRoot, 'jest');
  if (jestConfig) {
    logger.debug('Detected Jest from config file');
    return {
      framework: 'jest',
      configPath: jestConfig,
      detected: true,
    };
  }

  // Check existing test files for import patterns
  const testFiles = findFiles(projectRoot, /\.(test|spec)\.(ts|js|tsx|jsx)$/, [
    /node_modules/,
    /dist/,
  ]);

  if (testFiles.length > 0) {
    const framework = analyzeTestFileImports(testFiles[0]);
    if (framework) {
      logger.debug(`Detected ${framework} from existing test file patterns`);
      return {
        framework,
        detected: true,
      };
    }
  }

  // Default to Vitest
  logger.info('No test framework detected, defaulting to Vitest');
  return {
    framework: 'vitest',
    detected: false,
  };
}

function findConfigFile(projectRoot: string, framework: 'vitest' | 'jest'): string | undefined {
  const configNames =
    framework === 'vitest'
      ? ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mjs', 'vite.config.ts']
      : ['jest.config.ts', 'jest.config.js', 'jest.config.mjs', 'jest.config.json'];

  for (const name of configNames) {
    const path = join(projectRoot, name);
    if (existsSync(path)) {
      return path;
    }
  }

  return undefined;
}

function analyzeTestFileImports(testFilePath: string): 'vitest' | 'jest' | null {
  try {
    const content = readFileSync(testFilePath, 'utf-8');

    // Check for Vitest imports
    if (
      /from ['"]vitest['"]/.test(content) ||
      /import.*from ['"]vitest['"]/.test(content) ||
      /import.*\{.*\}.*from ['"]vitest['"]/.test(content)
    ) {
      return 'vitest';
    }

    // Check for Jest imports
    if (
      /from ['"]@jest\/globals['"]/.test(content) ||
      /import.*from ['"]jest['"]/.test(content) ||
      /import.*\{.*\}.*from ['"]@jest\/globals['"]/.test(content)
    ) {
      return 'jest';
    }

    return null;
  } catch {
    return null;
  }
}

