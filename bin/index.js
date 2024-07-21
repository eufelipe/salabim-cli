#!/usr/bin/env node

const { program } = require('commander');
const { setupKeystore } = require('../lib/setupKeystore');
const { setupFastlane } = require('../lib/setupFastlane');

program
  .command('setup-keystore')
  .description('Setup keystore for Android project')
  .action(() => {
    setupKeystore();
  });

program
  .command('setup-fastlane')
  .description('Setup Fastlane for the project')
  .action(() => {
    setupFastlane();
  });

program.parse(process.argv);
