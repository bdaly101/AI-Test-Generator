import { simpleGit, SimpleGit } from 'simple-git';
import { logger } from './logger.js';

export class GitUtils {
  private git: SimpleGit;

  constructor(repoPath: string = process.cwd()) {
    this.git = simpleGit(repoPath);
  }

  /**
   * Check if the current directory is a git repository
   */
  async isGitRepo(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the current branch name
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const status = await this.git.status();
      return status.current || 'HEAD';
    } catch (error) {
      logger.error('Failed to get current branch:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Get the root directory of the git repository
   */
  async getRepoRoot(): Promise<string> {
    try {
      return await this.git.revparse(['--show-toplevel']);
    } catch (error) {
      logger.error('Failed to get repo root:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Check if a file is tracked by git
   */
  async isTracked(filePath: string): Promise<boolean> {
    try {
      const result = await this.git.raw(['ls-files', '--error-unmatch', filePath]);
      return result.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get the merge base between two branches
   */
  async getMergeBase(branch1: string, branch2: string): Promise<string> {
    try {
      const result = await this.git.raw(['merge-base', branch1, branch2]);
      return result.trim();
    } catch (error) {
      logger.error(`Failed to get merge base between ${branch1} and ${branch2}:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Check if a branch exists
   */
  async branchExists(branch: string): Promise<boolean> {
    try {
      const branches = await this.git.branchLocal();
      return branches.all.includes(branch);
    } catch {
      return false;
    }
  }

  /**
   * Get the git instance for advanced operations
   */
  getGitInstance(): SimpleGit {
    return this.git;
  }
}

