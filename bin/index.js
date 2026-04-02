#!/usr/bin/env node

import { execFileSync, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const projectName = process.argv[2];

if (!projectName) {
  console.error('❌ Please provide a project name: create-react-tailwind my-app');
  process.exit(1);
}

const targetDir = path.resolve(process.cwd(), projectName);

console.log(`🚀 Creating ${projectName}...`);

execFileSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['create', 'vite@latest', projectName, '--', '--template', 'react-ts'],
  { stdio: 'inherit' }
);

process.chdir(targetDir);

console.log('📦 Installing dependencies...');
execSync('npm install', { stdio: 'inherit' });

console.log('🎨 Installing Tailwind CSS...');
execSync('npm install tailwindcss @tailwindcss/vite', { stdio: 'inherit' });

// Patch vite.config.ts
let viteConfig = fs.readFileSync('vite.config.ts', 'utf8');
viteConfig = viteConfig.replace(
  "import react from '@vitejs/plugin-react'",
  "import react from '@vitejs/plugin-react'\nimport tailwindcss from '@tailwindcss/vite'"
);
viteConfig = viteConfig.replace(
  'plugins: [react()]',
  'plugins: [react(), tailwindcss()]'
);
fs.writeFileSync('vite.config.ts', viteConfig);

// Patch index.css
let css = fs.readFileSync('src/index.css', 'utf8');
css = '@import "tailwindcss";\n\n' + css;
fs.writeFileSync('src/index.css', css);

console.log(`\n✅ Done! Now run:\n   cd ${projectName}\n   npm run dev`);
