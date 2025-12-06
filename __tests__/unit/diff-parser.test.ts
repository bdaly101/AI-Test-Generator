import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiffParser } from '../../src/core/diff-parser.js';

// Mock simple-git
vi.mock('simple-git', () => ({
  simpleGit: vi.fn(() => ({
    diff: vi.fn(),
    raw: vi.fn(),
    status: vi.fn(),
    fetch: vi.fn(),
  })),
}));

describe('DiffParser', () => {
  let parser: DiffParser;

  beforeEach(() => {
    vi.clearAllMocks();
    parser = new DiffParser();
  });

  describe('parseDiff', () => {
    it('should parse empty diff correctly', async () => {
      const git = (parser as any).git;
      git.diff.mockResolvedValue('');
      git.status.mockResolvedValue({ current: 'main' });

      const result = await parser.getStagedDiff();

      expect(result.files).toHaveLength(0);
      expect(result.summary).toContain('No');
    });

    it('should parse diff with single file', async () => {
      const sampleDiff = `diff --git a/src/utils.ts b/src/utils.ts
index 1234567..abcdefg 100644
--- a/src/utils.ts
+++ b/src/utils.ts
@@ -1,3 +1,5 @@
 export function hello() {
+  console.log('hello');
   return 'hello';
 }`;

      const git = (parser as any).git;
      git.diff.mockResolvedValue(sampleDiff);
      git.status.mockResolvedValue({ current: 'main' });

      const result = await parser.getStagedDiff();

      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe('src/utils.ts');
      expect(result.summary).toContain('1 file');
    });

    it('should parse diff with multiple files', async () => {
      const sampleDiff = `diff --git a/src/utils.ts b/src/utils.ts
index 1234567..abcdefg 100644
--- a/src/utils.ts
+++ b/src/utils.ts
@@ -1,3 +1,5 @@
+// Comment
 export function hello() {}
diff --git a/src/helpers.ts b/src/helpers.ts
index 2345678..bcdefgh 100644
--- a/src/helpers.ts
+++ b/src/helpers.ts
@@ -1,3 +1,5 @@
+// Comment
 export function helper() {}`;

      const git = (parser as any).git;
      git.diff.mockResolvedValue(sampleDiff);
      git.status.mockResolvedValue({ current: 'main' });

      const result = await parser.getStagedDiff();

      expect(result.files).toHaveLength(2);
      expect(result.files[0].path).toBe('src/utils.ts');
      expect(result.files[1].path).toBe('src/helpers.ts');
    });
  });

  describe('getBranchDiff', () => {
    it('should get diff compared to another branch', async () => {
      const sampleDiff = `diff --git a/src/feature.ts b/src/feature.ts
index 1234567..abcdefg 100644
--- a/src/feature.ts
+++ b/src/feature.ts
@@ -1,3 +1,5 @@
+// New feature
 export function feature() {}`;

      const git = (parser as any).git;
      git.diff.mockResolvedValue(sampleDiff);
      git.status.mockResolvedValue({ current: 'feature-branch' });
      git.raw.mockResolvedValue('abc123');

      const result = await parser.getBranchDiff('main');

      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe('src/feature.ts');
    });
  });
});

