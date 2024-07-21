#!/usr/bin/env node

const { program } = require('commander');
const { setupKeystore } = require('../lib/setupKeystore');
const { setupFastlane } = require('../lib/setupFastlane');
const { setupLinting } = require('../lib/setupLinting');

program
  .command('setup-keystore')
  .description('Setup keystore for Android project')
  .action(() => {
    setupKeystore();
  });

program
  .command('setup-fastlane')
  .description('Setup Fastlane for Android project')
  .action(() => {
    setupFastlane();
  });

program
  .command('setup-linting')
  .description('Setup ESLint and Prettier for the project')
  .action(() => {
    setupLinting();
  });

program.parse(process.argv);
