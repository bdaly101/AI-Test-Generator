import { Project, SourceFile, FunctionDeclaration } from 'ts-morph';
import { readFile } from '../utils/fs.js';
import { logger } from '../utils/logger.js';
import { join, dirname } from 'path';

export interface FunctionInfo {
  name: string;
  parameters: ParameterInfo[];
  returnType: string;
  isExported: boolean;
  isAsync: boolean;
  jsdoc?: string;
  lineNumber: number;
}

export interface ParameterInfo {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}

export interface ClassInfo {
  name: string;
  methods: FunctionInfo[];
  properties: PropertyInfo[];
  isExported: boolean;
  lineNumber: number;
}

export interface PropertyInfo {
  name: string;
  type: string;
  optional: boolean;
  isReadonly: boolean;
}

export interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'variable' | 'type' | 'interface';
  lineNumber: number;
}

export interface ImportInfo {
  module: string;
  imports: string[];
  isTypeOnly: boolean;
}

export interface CodeAnalysis {
  functions: FunctionInfo[];
  classes: ClassInfo[];
  exports: ExportInfo[];
  imports: ImportInfo[];
  existingTests: string[];
  isEdgeFunction: boolean;
  dependencies: string[];
  filePath: string;
  language: 'typescript' | 'javascript';
}

export class CodeAnalyzer {
  private project: Project;

  constructor() {
    this.project = new Project({
      skipAddingFilesFromTsConfig: true,
      skipFileDependencyResolution: true,
    });
  }

  /**
   * Analyze a source file and extract code structure
   */
  async analyzeFile(filePath: string, projectRoot: string = process.cwd()): Promise<CodeAnalysis> {
    try {
      const content = readFile(filePath);
      const sourceFile = this.project.createSourceFile(filePath, content, { overwrite: true });

      const functions = this.extractFunctions(sourceFile);
      const classes = this.extractClasses(sourceFile);
      const exports = this.extractExports(sourceFile);
      const imports = this.extractImports(sourceFile);
      const existingTests = this.findExistingTests(filePath, projectRoot);
      const isEdgeFunction = this.isSupabaseEdgeFunction(filePath, content);
      const dependencies = this.extractDependencies(imports);
      const language = filePath.endsWith('.ts') || filePath.endsWith('.tsx') ? 'typescript' : 'javascript';

      return {
        functions,
        classes,
        exports,
        imports,
        existingTests,
        isEdgeFunction,
        dependencies,
        filePath,
        language,
      };
    } catch (error) {
      logger.error(`Failed to analyze file ${filePath}:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  private extractFunctions(sourceFile: SourceFile): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    // Function declarations
    sourceFile.getFunctions().forEach((func) => {
      functions.push(this.extractFunctionInfo(func));
    });

    // Methods in classes
    sourceFile.getClasses().forEach((cls) => {
      cls.getMethods().forEach((method) => {
        functions.push(this.extractFunctionInfo(method));
      });
    });

    return functions;
  }

  private extractFunctionInfo(func: FunctionDeclaration | any): FunctionInfo {
    const parameters = func.getParameters().map((param: any) => ({
      name: param.getName(),
      type: param.getTypeNode()?.getText() || 'any',
      optional: param.hasQuestionToken(),
      defaultValue: param.getInitializer()?.getText(),
    }));

    return {
      name: func.getName() || '<anonymous>',
      parameters,
      returnType: func.getReturnTypeNode()?.getText() || 'void',
      isExported: func.isExported(),
      isAsync: func.isAsync(),
      jsdoc: func.getJsDocs().map((doc: any) => doc.getComment()).join('\n'),
      lineNumber: func.getStartLineNumber(),
    };
  }

  private extractClasses(sourceFile: SourceFile): ClassInfo[] {
    return sourceFile.getClasses().map((cls) => {
      const methods = cls.getMethods().map((method) => this.extractFunctionInfo(method));
      const properties = cls.getProperties().map((prop) => ({
        name: prop.getName(),
        type: prop.getTypeNode()?.getText() || 'any',
        optional: prop.hasQuestionToken(),
        isReadonly: prop.isReadonly(),
      }));

      return {
        name: cls.getName() || '<anonymous>',
        methods,
        properties,
        isExported: cls.isExported(),
        lineNumber: cls.getStartLineNumber(),
      };
    });
  }

  private extractExports(sourceFile: SourceFile): ExportInfo[] {
    const exports: ExportInfo[] = [];

    // Named exports
    sourceFile.getExportedDeclarations().forEach((declarations, name) => {
      declarations.forEach((declaration) => {
        let type: ExportInfo['type'] = 'variable';
        if (declaration.getKindName() === 'FunctionDeclaration') {
          type = 'function';
        } else if (declaration.getKindName() === 'ClassDeclaration') {
          type = 'class';
        } else if (declaration.getKindName() === 'TypeAliasDeclaration') {
          type = 'type';
        } else if (declaration.getKindName() === 'InterfaceDeclaration') {
          type = 'interface';
        }

        exports.push({
          name,
          type,
          lineNumber: declaration.getStartLineNumber(),
        });
      });
    });

    // Default export
    const defaultExport = sourceFile.getDefaultExportSymbol();
    if (defaultExport) {
      const defaultDeclaration = sourceFile.getStatements().find(s => s.getText().includes('export default'));
      exports.push({
        name: 'default',
        type: 'variable',
        lineNumber: defaultDeclaration?.getStartLineNumber() || 0,
      });
    }

    return exports;
  }

  private extractImports(sourceFile: SourceFile): ImportInfo[] {
    return sourceFile.getImportDeclarations().map((imp) => {
      const namedImports = imp.getNamedImports().map((named) => named.getName());
      const defaultImport = imp.getDefaultImport()?.getText();
      const namespaceImport = imp.getNamespaceImport()?.getText();

      const imports = [
        ...(defaultImport ? [defaultImport] : []),
        ...namedImports,
        ...(namespaceImport ? [namespaceImport] : []),
      ];

      return {
        module: imp.getModuleSpecifierValue(),
        imports,
        isTypeOnly: imp.isTypeOnly(),
      };
    });
  }

  private findExistingTests(filePath: string, _projectRoot: string): string[] {
    const testFiles: string[] = [];
    const dir = dirname(filePath);
    const fileName = filePath.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || '';

    // Common test file patterns
    const testPatterns = [
      join(dir, `${fileName}.test.ts`),
      join(dir, `${fileName}.test.tsx`),
      join(dir, `${fileName}.spec.ts`),
      join(dir, `${fileName}.spec.tsx`),
      join(dir, `__tests__`, `${fileName}.test.ts`),
      join(dir, `__tests__`, `${fileName}.spec.ts`),
    ];

    for (const pattern of testPatterns) {
      try {
        if (readFile(pattern)) {
          testFiles.push(pattern);
        }
      } catch {
        // File doesn't exist, continue
      }
    }

    return testFiles;
  }

  private isSupabaseEdgeFunction(filePath: string, content: string): boolean {
    // Check if file is in supabase/functions directory
    if (filePath.includes('supabase/functions/')) {
      return true;
    }

    // Check for Deno serve pattern
    if (content.includes('Deno.serve') || content.includes('serve(')) {
      return true;
    }

    // Check for Supabase Edge Function imports
    if (content.includes('@supabase/supabase-js') && content.includes('createClient')) {
      return true;
    }

    return false;
  }

  private extractDependencies(imports: ImportInfo[]): string[] {
    return imports
      .filter((imp) => !imp.isTypeOnly)
      .map((imp) => imp.module)
      .filter((module) => !module.startsWith('.') && !module.startsWith('/'));
  }
}

