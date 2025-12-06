import { simpleGit, SimpleGit } from 'simple-git';

export interface ParsedDiff {
  files: Array<{
    path: string;
    changes: string;
  }>;
  summary: string;
}

export class DiffParser {
  private git: SimpleGit;

  constructor(repoPath: string = process.cwd()) {
    this.git = simpleGit(repoPath);
  }

  async getStagedDiff(): Promise<ParsedDiff> {
    const diff = await this.git.diff(['--cached']);
    return this.parseDiff(diff, 'staged changes');
  }

  async getBranchDiff(branch: string): Promise<ParsedDiff> {
    // Get diff between current branch and the specified branch
    const currentBranch = await this.getCurrentBranch();
    const mergeBase = await this.git.raw(['merge-base', branch, currentBranch]);
    const diff = await this.git.diff([mergeBase.trim(), currentBranch]);
    return this.parseDiff(diff, `changes in ${currentBranch} vs ${branch}`);
  }

  async getPRDiff(prNumber: number, _owner: string, _repo: string): Promise<ParsedDiff> {
    // Fetch PR branch and get diff
    const prBranch = `pull/${prNumber}/head`;
    try {
      await this.git.fetch('origin', `${prBranch}:pr-${prNumber}`);
      const diff = await this.git.diff([`origin/main...pr-${prNumber}`]);
      return this.parseDiff(diff, `PR #${prNumber}`);
    } catch (error) {
      throw new Error(`Failed to fetch PR #${prNumber}: ${error}`);
    }
  }

  private async getCurrentBranch(): Promise<string> {
    const status = await this.git.status();
    return status.current || 'HEAD';
  }

  private parseDiff(diffOutput: string, summary: string): ParsedDiff {
    if (!diffOutput || diffOutput.trim() === '') {
      return {
        files: [],
        summary: `No ${summary}`,
      };
    }

    const files: Array<{ path: string; changes: string }> = [];
    
    // Split by file headers (diff --git)
    const fileBlocks = diffOutput.split(/(?=diff --git)/g).filter(block => block.trim());
    
    for (const block of fileBlocks) {
      // Extract file path from "diff --git a/path b/path"
      const pathMatch = block.match(/diff --git a\/(.+?) b\/(.+)/);
      if (pathMatch) {
        const path = pathMatch[2];
        files.push({
          path,
          changes: block,
        });
      }
    }

    return {
      files,
      summary: `Found ${files.length} file(s) with ${summary}`,
    };
  }
}
