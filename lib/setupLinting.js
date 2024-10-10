const shell = require('shelljs');
const fs = require('fs');
const path = require('path');
const prompts = require('prompts');

const ESLINT_VERSION = '^8.57.0';
const PRETTIER_VERSION = '^3.3.3';

async function setupLinting() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const eslintConfigPath = path.join(process.cwd(), '.eslintrc.js');
  const prettierrcPath = path.join(process.cwd(), '.prettierrc.js');
  const vscodeSettingsPath = path.join(process.cwd(), '.vscode/settings.json');
  let packageManager = '';
  let lockFilePath = '';

  // Detect package manager
  if (fs.existsSync(path.join(process.cwd(), 'yarn.lock'))) {
    packageManager = 'yarn';
    lockFilePath = 'yarn.lock';
  } else if (fs.existsSync(path.join(process.cwd(), 'package-lock.json'))) {
    packageManager = 'npm';
    lockFilePath = 'package-lock.json';
  } else if (fs.existsSync(path.join(process.cwd(), 'pnpm-lock.yaml'))) {
    packageManager = 'pnpm';
    lockFilePath = 'pnpm-lock.yaml';
  } else {
    console.error('No lock file found. Please use npm, yarn, or pnpm.');
    process.exit(1);
  }

  // Install dependencies
  const installCommand = {
    yarn: `yarn add eslint@${ESLINT_VERSION} prettier@${PRETTIER_VERSION} @durumim/eslint-config -D`,
    npm: `npm install eslint@${ESLINT_VERSION} prettier@${PRETTIER_VERSION} @durumim/eslint-config --save-dev`,
    pnpm: `pnpm add eslint@${ESLINT_VERSION} prettier@${PRETTIER_VERSION} @durumim/eslint-config -D`,
  };

  if (shell.exec(installCommand[packageManager]).code !== 0) {
    console.error('Failed to install dependencies.');
    process.exit(1);
  }

  // Update ESLint configuration
  if (fs.existsSync(eslintConfigPath)) {
    let eslintConfig = fs.readFileSync(eslintConfigPath, 'utf8');
    eslintConfig = eslintConfig.replace(
      /extends\s*:\s*(\[[^\]]*\]|[^\s,]+),?/,
      "extends: '@durumim/eslint-config',"
    );
    fs.writeFileSync(eslintConfigPath, eslintConfig);
  } else {
    fs.writeFileSync(
      eslintConfigPath,
      `module.exports = {
  root: true,
  extends: '@durumim/eslint-config',
};`
    );
  }

  // Create or update .prettierrc.js with provided content
  const prettierConfigContent = `/**
 * @type {import("prettier").Config}
 */
export default {
  tabWidth: 2,
  semi: true,
  arrowParens: 'avoid',
  bracketSameLine: true,
  bracketSpacing: true,
  singleQuote: false,
  printWidth: 120,
  trailingComma: 'all',
  endOfLine: 'auto',
};`;

  fs.writeFileSync(prettierrcPath, prettierConfigContent);

  // Update package.json scripts
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.scripts = {
    ...packageJson.scripts,
    'format:check': 'prettier --check ./src',
    'format:write': 'prettier --write ./src',
    'lint:check': 'eslint ./src',
    'lint:fix': 'eslint ./src --fix',
  };
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Update or create .vscode/settings.json
  if (!fs.existsSync(path.join(process.cwd(), '.vscode'))) {
    fs.mkdirSync(path.join(process.cwd(), '.vscode'));
  }

  let vscodeSettings = {};
  if (fs.existsSync(vscodeSettingsPath)) {
    vscodeSettings = JSON.parse(fs.readFileSync(vscodeSettingsPath, 'utf8'));
  }

  vscodeSettings["eslint.workingDirectories"] = vscodeSettings["eslint.workingDirectories"] || ["./"];
  vscodeSettings["prettier.configPath"] = ".prettierrc.js";
  fs.writeFileSync(vscodeSettingsPath, JSON.stringify(vscodeSettings, null, 2));

  // Ask if you want to commit
  const commitAnswer = await prompts({
    type: 'confirm',
    name: 'commit',
    message: 'Do you want to commit the changes?',
    initial: true
  });

  // Commit the changes
  if (commitAnswer.commit) {
    shell.exec('git add .eslintrc.js');
    shell.exec('git add package.json');
    shell.exec(`git add ${lockFilePath}`);
    shell.exec('git add .prettierrc.js');
    shell.exec('git add .vscode/settings.json');
    shell.exec('git commit -m "feat: setup ESLint and Prettier with @durumim/eslint-config"');

    console.log('Changes committed successfully.');
  }
}

module.exports = { setupLinting };
