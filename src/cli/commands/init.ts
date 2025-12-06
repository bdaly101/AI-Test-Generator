import { Command } from 'commander';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { CONFIG_FILENAME, defaultConfig } from '../../config/index.js';

export function createInitCommand(): Command {
  const command = new Command('init');

  command
    .description('Initialize AI Test Generator configuration')
    .option('-f, --force', 'Overwrite existing configuration')
    .action(async (options) => {
      const configPath = join(process.cwd(), CONFIG_FILENAME);

      if (existsSync(configPath) && !options.force) {
        console.error(`Configuration file already exists: ${configPath}`);
        console.error('Use --force to overwrite');
        process.exit(1);
      }

      const config = {
        testFramework: defaultConfig.testFramework,
        outputDir: defaultConfig.outputDir,
        model: defaultConfig.model,
        includeEdgeFunctionTests: defaultConfig.includeEdgeFunctionTests,
        autoCommit: defaultConfig.autoCommit,
        branchPrefix: defaultConfig.branchPrefix,
        // Don't include API keys in the file - use environment variables
      };

      try {
        writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
        console.log(`✅ Created configuration file: ${configPath}`);
        console.log('\nNext steps:');
        console.log('1. Set environment variables:');
        console.log('   - ANTHROPIC_API_KEY (required for test generation)');
        console.log('   - GITHUB_TOKEN (required for PR operations)');
        console.log('2. Customize the configuration as needed');
        console.log('3. Run `ai-test-generator generate --staged` to generate tests');
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Failed to create configuration file: ${error.message}`);
        }
        process.exit(1);
      }
    });

  return command;
}
