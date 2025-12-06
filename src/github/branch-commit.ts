import { simpleGit, SimpleGit } from 'simple-git';
import { Octokit } from '@octokit/rest';

export class BranchCommitService {
  private git: SimpleGit;
  private octokit: Octokit;

  constructor(token: string, repoPath: string = process.cwd()) {
    if (!token) {
      throw new Error('GitHub token is required');
    }
    this.git = simpleGit(repoPath);
    this.octokit = new Octokit({ auth: token });
  }

  async createBranchAndCommit(
    branchName: string,
    files: string[],
    commitMessage: string
  ): Promise<string> {
    try {
      // Create new branch
      await this.git.checkoutLocalBranch(branchName);

      // Add files
      await this.git.add(files);

      // Commit
      await this.git.commit(commitMessage);

      // Get the new branch name
      const status = await this.git.status();
      return status.current || branchName;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create branch and commit: ${error.message}`);
      }
      throw error;
    }
  }

  async pushBranch(branchName: string): Promise<void> {
    try {
      await this.git.push('origin', branchName, ['--set-upstream']);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to push branch ${branchName}: ${error.message}`);
      }
      throw error;
    }
  }

  async createPullRequest(
    owner: string,
    repo: string,
    branchName: string,
    baseBranch: string,
    title: string,
    body: string
  ): Promise<number> {
    try {
      const response = await this.octokit.pulls.create({
        owner,
        repo,
        title,
        head: branchName,
        base: baseBranch,
        body,
      });

      return response.data.number;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create pull request: ${error.message}`);
      }
      throw error;
    }
  }

  generateBranchName(prefix: string, baseName?: string): string {
    const timestamp = Date.now();
    const base = baseName || 'tests';
    return `${prefix}/${base}-${timestamp}`;
  }
}
