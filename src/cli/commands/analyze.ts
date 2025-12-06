import { Command } from 'commander';
import { loadConfig } from '../../config/index.js';
import { DiffParser } from '../../core/diff-parser.js';
import { CodeAnalyzer } from '../../core/code-analyzer.js';
import { detectFramework } from '../../frameworks/detector.js';
import { EdgeFunctionDetector } from '../../supabase/edge-function.js';
import { logger } from '../../utils/logger.js';
import chalk from 'chalk';

export interface AnalysisResult {
  files: FileAnalysis[];
  summary: {
    totalFiles: number;
    filesWithTests: number;
    filesWithoutTests: number;
    edgeFunctions: number;
    totalFunctions: number;
    totalClasses: number;
  };
}

export interface FileAnalysis {
  path: string;
  hasTests: boolean;
  testFiles: string[];
  functions: number;
  classes: number;
  isEdgeFunction: boolean;
  framework?: 'vitest' | 'jest';
}

export function createAnalyzeCommand(): Command {
  const command = new Command('analyze');

  command
    .description('Analyze codebase for test coverage gaps without generating tests')
    .option('--staged', 'Analyze staged changes')
    .option('--branch <branch>', 'Analyze changes compared to a branch')
    .option('--output <format>', 'Output format (json|text)', 'text')
    .option('--verbose', 'Show detailed analysis')
    .action(async (options) => {
      try {
        const config = loadConfig();
        const diffParser = new DiffParser();
        const codeAnalyzer = new CodeAnalyzer();
        const edgeDetector = new EdgeFunctionDetector();

        // Get diff
        let diff;
        if (options.staged) {
          diff = await diffParser.getStagedDiff();
        } else if (options.branch) {
          diff = await diffParser.getBranchDiff(options.branch);
        } else {
          logger.error('Must specify --staged or --branch');
          process.exit(1);
        }

        if (!diff || diff.files.length === 0) {
          logger.info('No changes found to analyze');
          process.exit(0);
        }

        logger.info(`Analyzing ${diff.files.length} file(s)...`);

        // Detect framework
        const frameworkInfo = await detectFramework(process.cwd(), config.framework || 'auto');

        // Analyze each file
        const fileAnalyses: FileAnalysis[] = [];
        for (const file of diff.files) {
          try {
            const analysis = await codeAnalyzer.analyzeFile(file.path);
            const edgeAnalysis = edgeDetector.analyze(file.path);

            fileAnalyses.push({
              path: file.path,
              hasTests: analysis.existingTests.length > 0,
              testFiles: analysis.existingTests,
              functions: analysis.functions.length,
              classes: analysis.classes.length,
              isEdgeFunction: edgeAnalysis.isEdgeFunction,
              framework: frameworkInfo.framework,
            });
          } catch (error) {
            logger.warn(`Failed to analyze ${file.path}:`, error instanceof Error ? error.message : error);
          }
        }

        // Build summary
        const summary = {
          totalFiles: fileAnalyses.length,
          filesWithTests: fileAnalyses.filter((f) => f.hasTests).length,
          filesWithoutTests: fileAnalyses.filter((f) => !f.hasTests).length,
          edgeFunctions: fileAnalyses.filter((f) => f.isEdgeFunction).length,
          totalFunctions: fileAnalyses.reduce((sum, f) => sum + f.functions, 0),
          totalClasses: fileAnalyses.reduce((sum, f) => sum + f.classes, 0),
        };

        const result: AnalysisResult = {
          files: fileAnalyses,
          summary,
        };

        // Output results
        if (options.output === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          outputTextResult(result, options.verbose);
        }
      } catch (error) {
        logger.error('Analysis failed:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return command;
}

function outputTextResult(result: AnalysisResult, verbose: boolean): void {
  const { summary, files } = result;

  console.log(chalk.blue('\n📊 Test Coverage Analysis\n'));

  // Summary
  console.log(chalk.bold('Summary:'));
  console.log(`  Total files analyzed: ${summary.totalFiles}`);
  console.log(`  Files with tests: ${chalk.green(summary.filesWithTests)}`);
  console.log(`  Files without tests: ${chalk.yellow(summary.filesWithoutTests)}`);
  console.log(`  Edge functions: ${summary.edgeFunctions}`);
  console.log(`  Total functions: ${summary.totalFunctions}`);
  console.log(`  Total classes: ${summary.totalClasses}\n`);

  // Files without tests
  const filesWithoutTests = files.filter((f) => !f.hasTests);
  if (filesWithoutTests.length > 0) {
    console.log(chalk.yellow('Files without tests:'));
    filesWithoutTests.forEach((file) => {
      console.log(`  - ${file.path} (${file.functions} functions, ${file.classes} classes)`);
      if (file.isEdgeFunction) {
        console.log(chalk.gray(`    → Supabase Edge Function`));
      }
    });
    console.log('');
  }

  // Edge functions
  const edgeFunctions = files.filter((f) => f.isEdgeFunction);
  if (edgeFunctions.length > 0) {
    console.log(chalk.cyan('Supabase Edge Functions:'));
    edgeFunctions.forEach((file) => {
      console.log(`  - ${file.path}`);
      if (file.hasTests) {
        console.log(chalk.green(`    ✓ Has tests: ${file.testFiles.join(', ')}`));
      } else {
        console.log(chalk.yellow(`    ⚠ No tests found`));
      }
    });
    console.log('');
  }

  if (verbose) {
    console.log(chalk.blue('Detailed Analysis:\n'));
    files.forEach((file) => {
      console.log(chalk.bold(file.path));
      console.log(`  Framework: ${file.framework || 'unknown'}`);
      console.log(`  Functions: ${file.functions}`);
      console.log(`  Classes: ${file.classes}`);
      console.log(`  Has tests: ${file.hasTests ? chalk.green('Yes') : chalk.yellow('No')}`);
      if (file.testFiles.length > 0) {
        console.log(`  Test files: ${file.testFiles.join(', ')}`);
      }
      if (file.isEdgeFunction) {
        console.log(chalk.cyan(`  Edge Function: Yes`));
      }
      console.log('');
    });
  }
}

