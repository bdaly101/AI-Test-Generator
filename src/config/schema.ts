import { z } from 'zod';

const AISchema = z.object({
  model: z.string().default('claude-3-5-sonnet-20241022'),
  temperature: z.number().min(0).max(2).default(0.3),
  maxTokens: z.number().positive().default(4096),
});

const GitHubSchema = z.object({
  mode: z.enum(['comment', 'branch', 'none']).default('comment'),
  updateExisting: z.boolean().default(true),
  createPR: z.boolean().default(false),
});

const SupabaseSchema = z.object({
  enabled: z.boolean().default(true),
  functionsDir: z.string().default('supabase/functions'),
});

const TODOSchema = z.object({
  style: z.enum(['inline', 'block']).default('inline'),
  markers: z.array(z.string()).default(['TODO', 'FIXME', 'MANUAL']),
});

export const ConfigSchema = z.object({
  anthropicApiKey: z.string().optional(),
  githubToken: z.string().optional(),
  framework: z.enum(['vitest', 'jest', 'auto']).default('auto'),
  outputDir: z.string().default('__tests__/generated'),
  include: z.array(z.string()).default(['src/**/*.ts', 'src/**/*.tsx']),
  exclude: z.array(z.string()).default(['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**']),
  ai: AISchema.optional(),
  github: GitHubSchema.optional(),
  supabase: SupabaseSchema.optional(),
  todos: TODOSchema.optional(),
  // Legacy fields for backward compatibility
  testFramework: z.enum(['vitest', 'jest']).optional(),
  model: z.string().optional(),
  includeEdgeFunctionTests: z.boolean().optional(),
  autoCommit: z.boolean().optional(),
  branchPrefix: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export const defaultConfig: Config = {
  framework: 'auto',
  outputDir: '__tests__/generated',
  include: ['src/**/*.ts', 'src/**/*.tsx'],
  exclude: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'],
  ai: {
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.3,
    maxTokens: 4096,
  },
  github: {
    mode: 'comment',
    updateExisting: true,
    createPR: false,
  },
  supabase: {
    enabled: true,
    functionsDir: 'supabase/functions',
  },
  todos: {
    style: 'inline',
    markers: ['TODO', 'FIXME', 'MANUAL'],
  },
};
