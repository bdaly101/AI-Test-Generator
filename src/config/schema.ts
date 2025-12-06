import { z } from 'zod';

export const ConfigSchema = z.object({
  anthropicApiKey: z.string().optional(),
  githubToken: z.string().optional(),
  testFramework: z.enum(['vitest', 'jest']).default('vitest'),
  outputDir: z.string().default('__tests__/generated'),
  model: z.string().default('claude-3-5-sonnet-20241022'),
  includeEdgeFunctionTests: z.boolean().default(false),
  autoCommit: z.boolean().default(false),
  branchPrefix: z.string().default('test-gen'),
});

export type Config = z.infer<typeof ConfigSchema>;

export const defaultConfig: Config = {
  testFramework: 'vitest',
  outputDir: '__tests__/generated',
  model: 'claude-3-5-sonnet-20241022',
  includeEdgeFunctionTests: false,
  autoCommit: false,
  branchPrefix: 'test-gen',
};
