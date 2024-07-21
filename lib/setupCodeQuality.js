const shell = require('shelljs');
const fs = require('fs');
const path = require('path');
const prompts = require('prompts');

async function setupCodeQuality() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const lintStagedConfigPath = path.join(process.cwd(), '.lintstagedrc');
  const commitlintConfigPath = path.join(process.cwd(), 'commitlint.config.js');
  const huskyDirPath = path.join(process.cwd(), '.husky');
  let packageManager = '';

  // Detect package manager
  if (fs.existsSync(path.join(process.cwd(), 'yarn.lock'))) {
    packageManager = 'yarn';
  } else if (fs.existsSync(path.join(process.cwd(), 'package-lock.json'))) {
    packageManager = 'npm';
  } else if (fs.existsSync(path.join(process.cwd(), 'pnpm-lock.yaml'))) {
    packageManager = 'pnpm';
  } else {
    console.error('No lock file found. Please use npm, yarn, or pnpm.');
    process.exit(1);
  }

  // Install lint-staged dependencies
  const lintStagedInstallCommand = {
    yarn: `yarn add -D lint-staged`,
    npm: `npm install -D lint-staged`,
    pnpm: `pnpm add -D lint-staged`,
  };

  if (shell.exec(lintStagedInstallCommand[packageManager]).code !== 0) {
    console.error('Failed to install lint-staged dependencies.');
    process.exit(1);
  }

  // Create or update .lintstagedrc
  const lintStagedConfig = {
    './src/**/*.{ts,tsx,js}': ['npm run cspell', 'npm run lint:fix', 'npm run format:write']
  };

  if (fs.existsSync(lintStagedConfigPath)) {
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: '.lintstagedrc already exists. Do you want to overwrite it?',
      initial: false
    });

    if (overwrite) {
      fs.writeFileSync(lintStagedConfigPath, JSON.stringify(lintStagedConfig, null, 2));
    }
  } else {
    fs.writeFileSync(lintStagedConfigPath, JSON.stringify(lintStagedConfig, null, 2));
  }

  // Install commitlint dependencies
  const commitlintInstallCommand = {
    yarn: `yarn add -D @commitlint/cli @commitlint/config-conventional`,
    npm: `npm install -D @commitlint/cli @commitlint/config-conventional`,
    pnpm: `pnpm add -D @commitlint/cli @commitlint/config-conventional`,
  };

  if (shell.exec(commitlintInstallCommand[packageManager]).code !== 0) {
    console.error('Failed to install commitlint dependencies.');
    process.exit(1);
  }

  // Create or update commitlint.config.js
  const commitlintConfig = `module.exports = { extends: ['@commitlint/config-conventional'] };`;

  if (fs.existsSync(commitlintConfigPath)) {
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: 'commitlint.config.js already exists. Do you want to overwrite it?',
      initial: false
    });

    if (overwrite) {
      fs.writeFileSync(commitlintConfigPath, commitlintConfig);
    }
  } else {
    fs.writeFileSync(commitlintConfigPath, commitlintConfig);
  }

  // Install husky dependencies
  const huskyInstallCommand = {
    yarn: `yarn add -D husky`,
    npm: `npm install -D husky`,
    pnpm: `pnpm add -D husky`,
  };

  if (shell.exec(huskyInstallCommand[packageManager]).code !== 0) {
    console.error('Failed to install husky dependencies.');
    process.exit(1);
  }

  // Initialize husky
  if (shell.exec('npx husky install').code !== 0) {
    console.error('Failed to initialize husky.');
    process.exit(1);
  }

  // Create .husky directory if not exists
  if (!fs.existsSync(huskyDirPath)) {
    fs.mkdirSync(huskyDirPath);
  }

  // Create pre-commit hook
  const preCommitHook = `npx --no-install lint-staged`;
  fs.writeFileSync(path.join(huskyDirPath, 'pre-commit'), preCommitHook);
  fs.chmodSync(path.join(huskyDirPath, 'pre-commit'), '755');

  // Create commit-msg hook
  const commitMsgHook = `npx --no-install commitlint --edit "$1"`;
  fs.writeFileSync(path.join(huskyDirPath, 'commit-msg'), commitMsgHook);
  fs.chmodSync(path.join(huskyDirPath, 'commit-msg'), '755');

  // Create pre-push hook
  const prePushHook = `git diff --cached --quiet
if [ $? -ne 0 ]; then
  npm run test && npm run build
fi
`;
  fs.writeFileSync(path.join(huskyDirPath, 'pre-push'), prePushHook);
  fs.chmodSync(path.join(huskyDirPath, 'pre-push'), '755');

  // Update package.json scripts
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.scripts = {
    ...packageJson.scripts,
    "prepare": "husky install"
  };
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Ask if you want to commit the setup changes
  const commitAnswer = await prompts({
    type: 'confirm',
    name: 'commit',
    message: 'Do you want to commit the setup changes?',
    initial: true
  });

  // Commit the setup changes
  if (commitAnswer.commit) {
    shell.exec('git add .lintstagedrc commitlint.config.js .husky');
    shell.exec('git add package.json');
    if (packageManager === 'yarn') {
      shell.exec('git add yarn.lock');
    } else if (packageManager === 'npm') {
      shell.exec('git add package-lock.json');
    } else if (packageManager === 'pnpm') {
      shell.exec('git add pnpm-lock.yaml');
    }
    shell.exec('git commit -m "feat: setup lint-staged, commitlint, and husky"');

    console.log('Changes committed successfully.');
  }
}

module.exports = { setupCodeQuality };
