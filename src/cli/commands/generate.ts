import { Command } from 'commander';
import { loadConfig } from '../../config/index.js';
import { DiffParser } from '../../core/diff-parser.js';
import { TestGenerator } from '../../core/test-generator.js';
import { ClaudeClient } from '../../ai/claude-client.js';
import { PRCommentService } from '../../github/pr-comment.js';
import { BranchCommitService } from '../../github/branch-commit.js';

export function createGenerateCommand(): Command {
  const command = new Command('generate');

  command
    .description('Generate tests from git diffs')
    .option('--staged', 'Generate tests from staged changes')
    .option('--branch <branch>', 'Generate tests from changes compared to a branch')
    .option('--pr <number>', 'Generate tests from a pull request')
    .option('--owner <owner>', 'GitHub repository owner (required for --pr)')
    .option('--repo <repo>', 'GitHub repository name (required for --pr)')
    .option('--comment', 'Add tests as a PR comment (requires --pr)')
    .option('--commit', 'Commit generated tests to a new branch')
    .action(async (options) => {
      try {
        // Load configuration
        const config = loadConfig();

        // Validate options
        if (!options.staged && !options.branch && !options.pr) {
          console.error('Error: Must specify one of --staged, --branch, or --pr');
          process.exit(1);
        }

        if (options.pr && (!options.owner || !options.repo)) {
          console.error('Error: --owner and --repo are required when using --pr');
          process.exit(1);
        }

        // Initialize services
        const diffParser = new DiffParser();
        const testGenerator = new TestGenerator(config.outputDir);

        if (!config.anthropicApiKey) {
          console.error('Error: ANTHROPIC_API_KEY environment variable is required');
          console.error('Please set it or add it to your .aitestrc.json file');
          process.exit(1);
        }

        const claudeClient = new ClaudeClient(config.anthropicApiKey, config.model);

        // Get diff based on options
        console.log('📝 Fetching changes...');
        let diff;
        if (options.staged) {
          diff = await diffParser.getStagedDiff();
        } else if (options.branch) {
          diff = await diffParser.getBranchDiff(options.branch);
        } else if (options.pr) {
          diff = await diffParser.getPRDiff(
            parseInt(options.pr),
            options.owner,
            options.repo
          );
        }

        if (!diff || diff.files.length === 0) {
          console.log('No changes found to generate tests for');
          process.exit(0);
        }

        console.log(diff.summary);
        console.log(`\n🤖 Generating tests using ${config.model}...`);

        // Generate tests for each file
        const generatedTests = [];
        for (const file of diff.files) {
          console.log(`Generating tests for ${file.path}...`);
          
          const result = await claudeClient.generateTests({
            diff: file.changes,
            testFramework: config.testFramework,
            includeEdgeFunctionTests: config.includeEdgeFunctionTests,
          });

          const testFile = testGenerator.formatTestFile(
            file.path,
            result.tests,
            config.testFramework
          );

          generatedTests.push(testFile);
          console.log(`  ✓ Generated ${testFile.filePath}`);
        }

        // Write tests to disk
        console.log('\n📁 Writing test files...');
        const writtenFiles = await testGenerator.writeTests(generatedTests);
        
        console.log('\n✅ Test generation complete!');
        console.log(`Generated ${writtenFiles.length} test file(s) in ${config.outputDir}/`);
        writtenFiles.forEach(file => console.log(`  - ${file}`));

        // Handle PR comment if requested
        if (options.comment && options.pr) {
          if (!config.githubToken) {
            console.error('\n⚠️  Warning: GITHUB_TOKEN not set, skipping PR comment');
          } else {
            console.log('\n💬 Adding comment to PR...');
            const prCommentService = new PRCommentService(config.githubToken);
            const comment = prCommentService.formatTestGenerationComment(
              writtenFiles,
              'AI-generated tests based on PR changes'
            );
            await prCommentService.addComment(
              options.owner,
              options.repo,
              parseInt(options.pr),
              comment
            );
            console.log('✅ Comment added to PR');
          }
        }

        // Handle auto-commit if requested
        if (options.commit || config.autoCommit) {
          if (!config.githubToken) {
            console.error('\n⚠️  Warning: GITHUB_TOKEN not set, skipping auto-commit');
          } else {
            console.log('\n🌿 Creating branch and committing tests...');
            const branchService = new BranchCommitService(config.githubToken);
            const branchName = branchService.generateBranchName(config.branchPrefix);
            
            await branchService.createBranchAndCommit(
              branchName,
              writtenFiles,
              'chore: add AI-generated tests'
            );

            console.log(`✅ Tests committed to branch: ${branchName}`);
            console.log('To push: git push origin ' + branchName);
          }
        }

        console.log('\n⚠️  Remember to review the generated tests before using them!');
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Error: ${error.message}`);
        }
        process.exit(1);
      }
    });

  return command;
}
