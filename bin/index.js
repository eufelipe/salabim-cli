#!/usr/bin/env node

const { program } = require('commander');
const { setupKeystore } = require('../lib/setupKeystore');
const { setupLinting } = require('../lib/setupLinting');
const { setupFastlane } = require('../lib/setupFastlane');
const { setupCspell } = require('../lib/setupCspell');

program
  .command('setup-keystore')
  .description('Setup keystore for Android project')
  .action(() => {
    setupKeystore();
  });

program
  .command('setup-linting')
  .description('Setup ESLint and Prettier')
  .action(() => {
    setupLinting();
  });

program
  .command('setup-fastlane')
  .description('Setup Fastlane for Android project')
  .action(() => {
    setupFastlane();
  });

program
  .command('setup-cspell')
  .description('Setup Cspell for the project')
  .action(() => {
    setupCspell();
  });

program.parse(process.argv);
