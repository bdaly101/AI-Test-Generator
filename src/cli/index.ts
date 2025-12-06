#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createInitCommand } from './commands/init.js';
import { createGenerateCommand } from './commands/generate.js';
import { createAnalyzeCommand } from './commands/analyze.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJsonPath = join(__dirname, '../../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

const program = new Command();

program
  .name('ai-test-generator')
  .description('Generate Vitest/Jest tests from git diffs using Claude AI')
  .version(packageJson.version);

// Register commands
program.addCommand(createInitCommand());
program.addCommand(createGenerateCommand());
program.addCommand(createAnalyzeCommand());

// Parse arguments
program.parse();
