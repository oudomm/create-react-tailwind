#!/usr/bin/env node

import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const projectName = args.find((arg) => !arg.startsWith('-'));
const useTypeScript = args.includes('--ts');
const useJavaScript = args.includes('--js');

if (useTypeScript && useJavaScript) {
  console.error('❌ Please use only one language flag: --ts or --js');
  process.exit(1);
}

if (!projectName) {
  console.error('❌ Please provide a project name: create-react-tailwind my-app [--ts|--js]');
  process.exit(1);
}

const targetDir = path.resolve(process.cwd(), projectName);
const template = useTypeScript ? 'react-ts' : 'react';
const viteConfigFile = useTypeScript ? 'vite.config.ts' : 'vite.config.js';

function stripViteNextSteps(output) {
  return output
    .replace(/\n└  Done\. Now run:\n\n(?:  .+\n)+/g, '\n')
    .replace(/\nDone\. Now run:\n\n(?:  .+\n)+/g, '\n');
}

function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Expected file not found: ${filePath}`);
    process.exit(1);
  }

  return fs.readFileSync(filePath, 'utf8');
}

function updateViteConfig(filePath) {
  let viteConfig = readRequiredFile(filePath);

  if (!viteConfig.includes("from '@tailwindcss/vite'")) {
    const reactImportPattern = /(import\s+react\s+from\s+['"]@vitejs\/plugin-react['"]\s*;?\n?)/;

    if (!reactImportPattern.test(viteConfig)) {
      console.error(`❌ Could not find the React plugin import in ${filePath}`);
      process.exit(1);
    }

    viteConfig = viteConfig.replace(
      reactImportPattern,
      `$1import tailwindcss from '@tailwindcss/vite'\n`
    );
  }

  if (!/tailwindcss\s*\(\s*\)/.test(viteConfig)) {
    const pluginsPattern = /plugins\s*:\s*\[([\s\S]*?)\]/m;
    const pluginsMatch = viteConfig.match(pluginsPattern);

    if (!pluginsMatch) {
      console.error(`❌ Could not find the Vite plugins array in ${filePath}`);
      process.exit(1);
    }

    const pluginsContent = pluginsMatch[1];
    const trimmedPlugins = pluginsContent.trim();
    const updatedPlugins = trimmedPlugins
      ? `${trimmedPlugins}, tailwindcss()`
      : 'tailwindcss()';

    viteConfig = viteConfig.replace(
      pluginsPattern,
      `plugins: [${updatedPlugins}]`
    );
  }

  fs.writeFileSync(filePath, viteConfig);
}

function updateIndexCss(filePath) {
  let css = readRequiredFile(filePath);

  if (!css.includes('@import "tailwindcss";')) {
    css = '@import "tailwindcss";\n\n' + css;
    fs.writeFileSync(filePath, css);
  }
}

console.log(`🚀 Creating ${projectName}...`);

const createVite = spawnSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['create', 'vite@latest', projectName, '--', '--template', template, '--no-immediate'],
  { encoding: 'utf8' }
);

if (createVite.status !== 0) {
  if (createVite.stdout) {
    process.stdout.write(createVite.stdout);
  }
  if (createVite.stderr) {
    process.stderr.write(createVite.stderr);
  }
  process.exit(createVite.status ?? 1);
}

if (createVite.stdout) {
  process.stdout.write(stripViteNextSteps(createVite.stdout));
}
if (createVite.stderr) {
  process.stderr.write(stripViteNextSteps(createVite.stderr));
}

process.chdir(targetDir);

console.log('📦 Installing dependencies...');
execSync('npm install', { stdio: 'inherit' });

console.log('🎨 Installing Tailwind CSS...');
execSync('npm install tailwindcss @tailwindcss/vite', { stdio: 'inherit' });

updateViteConfig(viteConfigFile);
updateIndexCss('src/index.css');

console.log(`\n✅ Done! Now run:\n   cd ${projectName}\n   npm run dev`);
