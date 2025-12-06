import { readFile } from '../utils/fs.js';

export interface EdgeFunctionAnalysis {
  isEdgeFunction: boolean;
  functionName: string;
  methods: string[];
  requiresAuth: boolean;
  dbOperations: string[];
  hasCors: boolean;
  filePath: string;
}

export class EdgeFunctionDetector {
  /**
   * Analyze a file to determine if it's a Supabase Edge Function
   */
  analyze(filePath: string, content?: string): EdgeFunctionAnalysis {
    const fileContent = content || readFile(filePath);
    const isEdgeFunction = this.isSupabaseEdgeFunction(filePath, fileContent);

    if (!isEdgeFunction) {
      return {
        isEdgeFunction: false,
        functionName: '',
        methods: [],
        requiresAuth: false,
        dbOperations: [],
        hasCors: false,
        filePath,
      };
    }

    const functionName = this.extractFunctionName(filePath);
    const methods = this.extractHttpMethods(fileContent);
    const requiresAuth = this.requiresAuthentication(fileContent);
    const dbOperations = this.extractDbOperations(fileContent);
    const hasCors = this.hasCorsHeaders(fileContent);

    return {
      isEdgeFunction: true,
      functionName,
      methods,
      requiresAuth,
      dbOperations,
      hasCors,
      filePath,
    };
  }

  private isSupabaseEdgeFunction(filePath: string, content: string): boolean {
    // Check if file is in supabase/functions directory
    if (filePath.includes('supabase/functions/')) {
      return true;
    }

    // Check for Deno serve pattern
    if (content.includes('Deno.serve') || /serve\s*\(/.test(content)) {
      return true;
    }

    // Check for Supabase Edge Function imports
    if (
      content.includes('@supabase/supabase-js') &&
      (content.includes('createClient') || content.includes('serve'))
    ) {
      return true;
    }

    return false;
  }

  private extractFunctionName(filePath: string): string {
    // Extract function name from path: supabase/functions/function-name/index.ts -> function-name
    const match = filePath.match(/supabase\/functions\/([^/]+)/);
    if (match) {
      return match[1];
    }

    // Fallback to file name without extension
    const fileName = filePath.split('/').pop() || '';
    return fileName.replace(/\.(ts|js)$/, '');
  }

  private extractHttpMethods(content: string): string[] {
    const methods: string[] = [];
    const methodPatterns = {
      GET: /\bget\b|method\s*===\s*['"]GET['"]|method\s*===?\s*['"]GET['"]/i,
      POST: /\bpost\b|method\s*===\s*['"]POST['"]|method\s*===?\s*['"]POST['"]/i,
      PUT: /\bput\b|method\s*===\s*['"]PUT['"]|method\s*===?\s*['"]PUT['"]/i,
      PATCH: /\bpatch\b|method\s*===\s*['"]PATCH['"]|method\s*===?\s*['"]PATCH['"]/i,
      DELETE: /\bdelete\b|method\s*===\s*['"]DELETE['"]|method\s*===?\s*['"]DELETE['"]/i,
    };

    for (const [method, pattern] of Object.entries(methodPatterns)) {
      if (pattern.test(content)) {
        methods.push(method);
      }
    }

    // Default to GET if no methods found
    return methods.length > 0 ? methods : ['GET'];
  }

  private requiresAuthentication(content: string): boolean {
    // Check for common auth patterns
    const authPatterns = [
      /Authorization/i,
      /Bearer\s+token/i,
      /getAuthHeader/i,
      /req\.headers\.authorization/i,
      /authenticate/i,
      /verifyJWT/i,
      /supabase\.auth\.getUser/i,
    ];

    return authPatterns.some((pattern) => pattern.test(content));
  }

  private extractDbOperations(content: string): string[] {
    const operations: string[] = [];
    const operationPatterns = {
      select: /\.select\(|\.from\(/i,
      insert: /\.insert\(/i,
      update: /\.update\(/i,
      delete: /\.delete\(/i,
      upsert: /\.upsert\(/i,
      rpc: /\.rpc\(/i,
    };

    for (const [operation, pattern] of Object.entries(operationPatterns)) {
      if (pattern.test(content)) {
        operations.push(operation);
      }
    }

    return operations;
  }

  private hasCorsHeaders(content: string): boolean {
    return (
      /Access-Control-Allow-Origin/i.test(content) ||
      /CORS/i.test(content) ||
      /cors\(/i.test(content)
    );
  }
}

