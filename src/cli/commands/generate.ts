import { Command } from 'commander';
import { loadConfig } from '../../config/index.js';
import { DiffParser } from '../../core/diff-parser.js';
import { CodeAnalyzer } from '../../core/code-analyzer.js';
import { FileWriter } from '../../core/file-writer.js';
import { ClaudeClient } from '../../ai/claude-client.js';
import { detectFramework } from '../../frameworks/detector.js';
import { buildUnitTestPrompt } from '../../ai/prompts/unit-test.js';
import { buildSupabaseTestPrompt } from '../../ai/prompts/integration.js';
import { SYSTEM_PROMPT, SYSTEM_PROMPT_SUPABASE } from '../../ai/prompts/system.js';
import { EdgeFunctionDetector } from '../../supabase/edge-function.js';
import { PRCommentService } from '../../github/pr-comment.js';
import { BranchCommitService } from '../../github/branch-commit.js';
import { logger } from '../../utils/logger.js';
import { readFile } from '../../utils/fs.js';

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
          logger.error('Error: Must specify one of --staged, --branch, or --pr');
          process.exit(1);
        }

        if (options.pr && (!options.owner || !options.repo)) {
          logger.error('Error: --owner and --repo are required when using --pr');
          process.exit(1);
        }

        // Initialize services
        const diffParser = new DiffParser();
        const codeAnalyzer = new CodeAnalyzer();
        const edgeDetector = new EdgeFunctionDetector();
        const fileWriter = new FileWriter({
          outputDir: config.outputDir || '__tests__/generated',
          overwrite: false,
          addHeader: true,
        });

        if (!config.anthropicApiKey) {
          console.error('Error: ANTHROPIC_API_KEY environment variable is required');
          console.error('Please set it or add it to your .aitestrc.json file');
          process.exit(1);
        }

        // Detect framework
        const frameworkInfo = await detectFramework(process.cwd(), config.framework || config.testFramework || 'auto');
        const testFramework = frameworkInfo.framework;

        const claudeClient = new ClaudeClient({
          apiKey: config.anthropicApiKey,
          model: config.ai?.model || config.model || 'claude-3-5-sonnet-20241022',
          maxTokens: config.ai?.maxTokens || 4096,
          temperature: config.ai?.temperature || 0.3,
        });

        // Get diff based on options
        logger.info('📝 Fetching changes...');
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
          logger.info('No changes found to generate tests for');
          process.exit(0);
        }

        logger.info(diff.summary);
        const modelName = config.ai?.model || config.model || 'claude-3-5-sonnet-20241022';
        logger.info(`\n🤖 Generating tests using ${modelName}...`);

        // Analyze and generate tests for each file
        const writtenFiles: string[] = [];
        for (const file of diff.files) {
          try {
            logger.info(`Analyzing ${file.path}...`);
            
            // Analyze code
            const codeAnalysis = await codeAnalyzer.analyzeFile(file.path);
            const edgeAnalysis = edgeDetector.analyze(file.path, undefined);
            
            // Read full file content for context
            const fullFileContent = readFile(file.path);
            
            // Build prompt based on file type
            let systemPrompt = SYSTEM_PROMPT;
            let userPrompt: string;
            
            if (edgeAnalysis.isEdgeFunction && (config.supabase?.enabled ?? config.includeEdgeFunctionTests ?? true)) {
              systemPrompt = SYSTEM_PROMPT_SUPABASE;
              userPrompt = buildSupabaseTestPrompt({
                functionCode: fullFileContent,
                functionName: edgeAnalysis.functionName,
                methods: edgeAnalysis.methods,
                requiresAuth: edgeAnalysis.requiresAuth,
                dbOperations: edgeAnalysis.dbOperations,
                filePath: file.path,
              });
            } else {
              userPrompt = buildUnitTestPrompt({
                diffContent: file.changes,
                fullFileContent,
                language: codeAnalysis.language,
                framework: testFramework,
                existingTests: codeAnalysis.existingTests.length > 0 
                  ? codeAnalysis.existingTests.map(t => readFile(t)).join('\n\n')
                  : undefined,
                codeAnalysis,
              });
            }
            
            // Generate tests
            logger.info(`Generating tests for ${file.path}...`);
            const result = await claudeClient.generateTests({
              diff: file.changes,
              testFramework,
              includeEdgeFunctionTests: edgeAnalysis.isEdgeFunction,
              systemPrompt,
              userPrompt,
            });

            // Write test file
            const testFile = await fileWriter.writeTestFile(
              file.path,
              result.tests,
              testFramework
            );

            writtenFiles.push(testFile.filePath);
          } catch (error) {
            logger.error(`Failed to generate tests for ${file.path}:`, error instanceof Error ? error.message : error);
            // Continue with other files
          }
        }

        // Create index file
        if (writtenFiles.length > 0) {
          await fileWriter.createIndexFile();
        }
        
        logger.success('\n✅ Test generation complete!');
        logger.info(`Generated ${writtenFiles.length} test file(s) in ${config.outputDir || '__tests__/generated'}/`);
        writtenFiles.forEach(file => logger.info(`  - ${file}`));
        
        // Show TODO summary
        const allTODOs = fileWriter.getAllTODOs();
        if (allTODOs.length > 0) {
          logger.warn(`\n⚠️  Found ${allTODOs.length} TODO comment(s) requiring manual review`);
        }

        // Handle PR comment if requested
        if (options.comment && options.pr) {
          const githubToken = config.githubToken || process.env.GITHUB_TOKEN;
          if (!githubToken) {
            logger.warn('\n⚠️  Warning: GITHUB_TOKEN not set, skipping PR comment');
          } else {
            logger.info('\n💬 Adding comment to PR...');
            const prCommentService = new PRCommentService(githubToken);
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
            logger.success('✅ Comment added to PR');
          }
        }

        // Handle auto-commit if requested
        if (options.commit || config.autoCommit) {
          const githubToken = config.githubToken || process.env.GITHUB_TOKEN;
          if (!githubToken) {
            logger.warn('\n⚠️  Warning: GITHUB_TOKEN not set, skipping auto-commit');
          } else {
            logger.info('\n🌿 Creating branch and committing tests...');
            const branchService = new BranchCommitService(githubToken);
            const branchPrefix = config.branchPrefix || 'test-gen';
            const branchName = branchService.generateBranchName(branchPrefix);
            
            await branchService.createBranchAndCommit(
              branchName,
              writtenFiles,
              'chore: add AI-generated tests'
            );

            logger.success(`✅ Tests committed to branch: ${branchName}`);
            logger.info('To push: git push origin ' + branchName);
          }
        }

        logger.warn('\n⚠️  Remember to review the generated tests before using them!');
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Error: ${error.message}`);
        }
        process.exit(1);
      }
    });

  return command;
}
