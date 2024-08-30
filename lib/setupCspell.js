const shell = require('shelljs');
const fs = require('fs');
const path = require('path');
const prompts = require('prompts');

async function setupCspell() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const cspellConfigPath = path.join(process.cwd(), 'cspell.json');
  const projectWordsPath = path.join(process.cwd(), 'project-words.txt');
  const vscodeExtensionsPath = path.join(process.cwd(), '.vscode', 'extensions.json');
  const vscodeSettingsPath = path.join(process.cwd(), '.vscode', 'settings.json');
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

  // Install dependencies
  const installCommand = {
    yarn: `yarn add -D cspell`,
    npm: `npm install -D cspell`,
    pnpm: `pnpm add -D cspell`,
  };

  if (shell.exec(installCommand[packageManager]).code !== 0) {
    console.error('Failed to install dependencies.');
    process.exit(1);
  }

  // Ask if you want to install cspell-dict-pt-br
  const { installPtBrDict } = await prompts({
    type: 'confirm',
    name: 'installPtBrDict',
    message: 'Do you want to install the cspell-dict-pt-br dictionary?',
    initial: true
  });

  if (installPtBrDict) {
    const installPtBrCommand = {
      yarn: `yarn add -D cspell-dict-pt-br`,
      npm: `npm install -D cspell-dict-pt-br`,
      pnpm: `pnpm add -D cspell-dict-pt-br`,
    };

    if (shell.exec(installPtBrCommand[packageManager]).code !== 0) {
      console.error('Failed to install cspell-dict-pt-br.');
      process.exit(1);
    }
  }

  // Create or update cspell.json
  const cspellConfig = {
    $schema: "https://raw.githubusercontent.com/streetsidesoftware/cspell/main/cspell.schema.json",
    version: "0.2",
    language: "en,pt-BR",
    enableFiletypes: [
      "ts",
      "tsx",
      "js",
      "jsx",
      "json",
      "md",
      "yaml",
      "yml",
      "mdx"
    ],
    dictionaries: ["typescript", "node", "pt-br", "words"],
    ignorePaths: ["node_modules/**", "dist/**"],
    dictionaryDefinitions: [
      {
        name: "words",
        path: "./project-words.txt",
        addWords: true
      },
      {
        name: "pt-br",
        path: "./node_modules/cspell-dict-pt-br/cspell-ext.json",
        description: "Portuguese (Brazilian) Dictionary"
      },
    ],
    overrides: [
      {
        filename: "**/*.json",
        dictionaries: ["json"]
      },
      {
        filename: "**/*.md",
        dictionaries: ["markdown"]
      }
    ]
  };

  if (fs.existsSync(cspellConfigPath)) {
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: 'cspell.json already exists. Do you want to overwrite it?',
      initial: false
    });

    if (overwrite) {
      fs.writeFileSync(cspellConfigPath, JSON.stringify(cspellConfig, null, 2));
    }
  } else {
    fs.writeFileSync(cspellConfigPath, JSON.stringify(cspellConfig, null, 2));
  }

  // Create or update project-words.txt
  if (fs.existsSync(projectWordsPath)) {
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: 'project-words.txt already exists. Do you want to overwrite it?',
      initial: false
    });

    if (overwrite) {
      fs.writeFileSync(projectWordsPath, '');
    }
  } else {
    fs.writeFileSync(projectWordsPath, '');
  }

  // Update or create .vscode/extensions.json
  let vscodeExtensions = { recommendations: [] };
  if (fs.existsSync(vscodeExtensionsPath)) {
    vscodeExtensions = JSON.parse(fs.readFileSync(vscodeExtensionsPath, 'utf8'));
  } else {
    if (!fs.existsSync(path.join(process.cwd(), '.vscode'))) {
      fs.mkdirSync(path.join(process.cwd(), '.vscode'));
    }
  }

  const recommendations = ["streetsidesoftware.code-spell-checker", "streetsidesoftware.code-spell-checker-portuguese-brazilian"];
  vscodeExtensions.recommendations = Array.from(new Set([...vscodeExtensions.recommendations, ...recommendations]));

  fs.writeFileSync(vscodeExtensionsPath, JSON.stringify(vscodeExtensions, null, 2));

  // Update or create .vscode/settings.json
  let vscodeSettings = {};
  if (fs.existsSync(vscodeSettingsPath)) {
    vscodeSettings = JSON.parse(fs.readFileSync(vscodeSettingsPath, 'utf8'));
  }

  vscodeSettings["cSpell.language"] = "en,pt,pt-BR";
  vscodeSettings["cSpell.dictionaries"] = ["typescript", "node", "pt-br", "words"];
  vscodeSettings["cSpell.ignorePaths"] = ["node_modules/**", "dist/**"];
  vscodeSettings["cSpell.customDictionaries"] = {
    "pt-br": {
      "path": "node_modules/cspell-dict-pt-br/cspell-ext.json",
      "addWords": true,
      "description": "Portuguese - Brazil dictionary"
    }
  };

  fs.writeFileSync(vscodeSettingsPath, JSON.stringify(vscodeSettings, null, 2));

  // Update package.json scripts
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.scripts = {
    ...packageJson.scripts,
    'cspell': "cspell '**/*.{js,jsx,ts,tsx}'",
  };
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Ask if you want to commit
  const commitAnswer = await prompts({
    type: 'confirm',
    name: 'commit',
    message: 'Do you want to commit the changes?',
    initial: true
  });

  // Commit the changes
  if (commitAnswer.commit) {
    shell.exec('git add cspell.json project-words.txt .vscode/extensions.json .vscode/settings.json package.json');
    if (packageManager === 'yarn') {
      shell.exec('git add yarn.lock');
    } else if (packageManager === 'npm') {
      shell.exec('git add package-lock.json');
    } else if (packageManager === 'pnpm') {
      shell.exec('git add pnpm-lock.yaml');
    }
    shell.exec('git commit -m "feat: setup Cspell with configuration and project-words.txt"');

    console.log('Changes committed successfully.');
  }
}

module.exports = { setupCspell };
