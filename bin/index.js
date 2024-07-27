#!/usr/bin/env node

const { program } = require("commander");
const updateNotifier = require("update-notifier");
const chalk = require('chalk');
const packageJson = require("../package.json");

const { setupKeystore } = require("../lib/setupKeystore");
const { setupLinting } = require("../lib/setupLinting");
const { setupFastlane } = require("../lib/setupFastlane");
const { setupCspell } = require("../lib/setupCspell");
const { setupCodeQuality } = require("../lib/setupCodeQuality");

const notifier = updateNotifier({ pkg: packageJson });
if (notifier.update) {
  const message =
    `Coe mané! Tá de bobeira? Já tem uma nova atualização disponível: ${chalk.dim(
      notifier.update.current
    )} → ${chalk.green(notifier.update.latest)}\n` +
    `Execute ${chalk.cyan(`npm install -g ${packageJson.name}`)} para ficar de boas!`;

  notifier.notify({ message });
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

program.parse(process.argv);
