/**
 * Post-generate fixup: adds .ts extensions to relative imports in orval-generated files.
 *
 * Orval generates extensionless imports (e.g. `from './blockNumberResponse'`) which are
 * incompatible with Node's nodenext module resolution. This script rewrites them to use
 * .ts extensions so that TypeScript's rewriteRelativeImportExtensions converts them to
 * .js on build.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatedDir = resolve(__dirname, '..', 'src', 'generated');

function fixFile(filePath: string): void {
  const fileDir = dirname(filePath);
  const content = readFileSync(filePath, 'utf8');
  const fixed = content.replace(
    /(from\s+['"])(\.\.?\/[^'"]+?)(?<!\.\w+)(['"])/g,
    (_match, prefix: string, importPath: string, suffix: string) => {
      if (/\.\w+$/.test(importPath)) return `${prefix}${importPath}${suffix}`;
      const resolved = resolve(fileDir, importPath);
      if (existsSync(resolved) && statSync(resolved).isDirectory()) {
        return `${prefix}${importPath}/index.ts${suffix}`;
      }
      return `${prefix}${importPath}.ts${suffix}`;
    }
  );
  if (fixed !== content) {
    writeFileSync(filePath, fixed);
    console.log(`Fixed: ${filePath}`);
  }
}

function walkDir(dir: string): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkDir(full);
    } else if (full.endsWith('.ts')) {
      fixFile(full);
    }
  }
}

walkDir(generatedDir);
