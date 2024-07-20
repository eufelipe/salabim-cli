#!/usr/bin/env node

const { program } = require('commander');
const { setupKeystore } = require('../lib/setupKeystore');

program
  .command('setup-keystore')
  .description('Setup keystore for Android project')
  .action(() => {
    setupKeystore();
  });

program.parse(process.argv);
