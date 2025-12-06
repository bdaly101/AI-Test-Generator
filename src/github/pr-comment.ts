import { Octokit } from '@octokit/rest';

export class PRCommentService {
  private octokit: Octokit;

  constructor(token: string) {
    if (!token) {
      throw new Error('GitHub token is required');
    }
    this.octokit = new Octokit({ auth: token });
  }

  async addComment(
    owner: string,
    repo: string,
    prNumber: number,
    comment: string
  ): Promise<void> {
    try {
      await this.octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: comment,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to add comment to PR #${prNumber}: ${error.message}`);
      }
      throw error;
    }
  }

  formatTestGenerationComment(
    filesGenerated: string[],
    reasoning: string
  ): string {
    const fileList = filesGenerated.map(f => `- \`${f}\``).join('\n');
    
    return `## 🤖 AI Test Generator

**Generated ${filesGenerated.length} test file(s)**

${fileList}

### Reasoning
${reasoning}

> ⚠️ **Note**: Please review the generated tests and adjust as needed. Look for TODO comments in the test files.`;
  }
}
