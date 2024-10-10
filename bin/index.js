#!/usr/bin/env node --no-warnings=ExperimentalWarning

const packageJson = require("../package.json");
const { program } = require("commander");
const { setupKeystore } = require("../lib/setupKeystore");
const { setupLinting } = require("../lib/setupLinting");
const { setupFastlane } = require("../lib/setupFastlane");
const { setupCspell } = require("../lib/setupCspell");
const { setupCodeQuality } = require("../lib/setupCodeQuality");
const { setupAliasPath } = require("../lib/setupAliasPath");
const { setupEnvironmentConfig } = require("../lib/setupEnvironmentConfig");

async function checkForUpdates() {
  const { default: updateNotifier } = await import("update-notifier");
  const { default: chalk } = await import("chalk");

  const notifier = updateNotifier({ pkg: packageJson });
  if (notifier.update) {
    const message =
      `Coe mané! Tá de bobeira? Já tem uma nova atualização disponível: ${chalk.dim(
        notifier.update.current
      )} → ${chalk.green(notifier.update.latest)}\n` +
      `Execute ${chalk.cyan(
        `npm install -g ${packageJson.name}`
      )} para ficar de boas!`;

    notifier.notify({ message });
  }
}

async function main() { 
  
  await checkForUpdates();
 
  if (process.argv.includes('-v') || process.argv.includes('--version')) {
    console.log(packageJson.version);
    process.exit(0);
  }

  program.version(
    packageJson.version,
    "-v, --version",
    "output the current version"
  );

  program
    .command("setup-keystore")
    .description("Setup keystore for Android project")
    .action(() => {
      setupKeystore();
    });

  program
    .command("setup-linting")
    .description("Setup ESLint and Prettier")
    .action(() => {
      setupLinting();
    });

  program
    .command("setup-fastlane")
    .description("Setup Fastlane for Android project")
    .action(() => {
      setupFastlane();
    });

  program
    .command("setup-cspell")
    .description("Setup Cspell for the project")
    .action(() => {
      setupCspell();
    });

  program
    .command("setup-code-quality")
    .description("Setup lint-staged, commitlint, and husky")
    .action(() => {
      setupCodeQuality();
    });

  program
    .command("setup-alias-path")
    .description("Setup TypeScript alias path")
    .action(() => {
      setupAliasPath();
    });

  program
    .command("setup-environment-config")
    .description("Setup environment configuration")
    .action(() => {
      setupEnvironmentConfig();
    });

  program.parse(process.argv);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
