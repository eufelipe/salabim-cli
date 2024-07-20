const shell = require('shelljs');
const fs = require('fs');
const path = require('path');
const prompts = require('prompts');

async function setupKeystore() {
  const androidPath = path.join(process.cwd(), 'android');
  const appPath = path.join(androidPath, 'app');
  const keystorePath = path.join(appPath, 'app.keystore');
  const buildGradlePath = path.join(appPath, 'build.gradle');

  // Ensure android/app directory exists
  if (!fs.existsSync(androidPath)) {
    fs.mkdirSync(androidPath);
  }
  if (!fs.existsSync(appPath)) {
    fs.mkdirSync(appPath);
  }

  let aliasExists = true;
  let answers = {};

  while (aliasExists) {
    answers = await prompts([
      {
        type: 'text',
        name: 'keystoreName',
        message: 'Enter keystore name:',
        initial: 'app.keystore'
      },
      {
        type: 'text',
        name: 'alias',
        message: 'Enter key alias:',
        initial: 'app'
      },
      {
        type: 'password',
        name: 'storePassword',
        message: 'Enter keystore password:',
        validate: value => value.length >= 6 ? true : 'Password must be at least 6 characters'
      },
      {
        type: 'password',
        name: 'keyPassword',
        message: 'Enter key password:',
        validate: value => value.length >= 6 ? true : 'Password must be at least 6 characters'
      },
      {
        type: 'text',
        name: 'dname',
        message: 'Enter distinguished name (e.g., "CN=John Doe, OU=Development, O=Company, L=City, ST=State, C=US"):',
        initial: 'CN=Unknown, OU=Development, O=Company, L=City, ST=State, C=US'
      }
    ]);

    if (fs.existsSync(keystorePath)) {
      const result = shell.exec(`keytool -list -keystore ${keystorePath} -alias ${answers.alias} -storepass ${answers.storePassword}`, { silent: true });
      aliasExists = result.stdout.includes(`Alias <${answers.alias}>`);
      if (aliasExists) {
        console.log('Alias already exists. Please enter a different alias.');
      }
    } else {
      aliasExists = false;
    }
  }

  // Generate the keystore using PKCS12 directly to avoid migration warning
  const generateKeystoreCmd = `keytool -genkey -v -keystore ${path.join(appPath, answers.keystoreName)} -alias ${answers.alias} -keyalg RSA -keysize 2048 -validity 10000 -storepass ${answers.storePassword} -keypass ${answers.keyPassword} -dname "${answers.dname}" -storetype pkcs12`;
  
  if (shell.exec(generateKeystoreCmd).code !== 0) {
    console.error('Failed to generate keystore.');
    process.exit(1);
  }

  // Update or create local.properties
  const localPropertiesPath = path.join(androidPath, 'local.properties');
  const localPropertiesContent = `
RELEASE_STORE_FILE=${answers.keystoreName}
RELEASE_KEY_ALIAS=${answers.alias}
RELEASE_STORE_PASSWORD=${answers.storePassword}
RELEASE_KEY_PASSWORD=${answers.keyPassword}
`;
  fs.writeFileSync(localPropertiesPath, localPropertiesContent);

  // Ensure build.gradle exists
  if (!fs.existsSync(buildGradlePath)) {
    fs.writeFileSync(buildGradlePath, '');
  }

  // Update build.gradle
  let buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');

  if (!buildGradleContent.includes('Properties localProperties = new Properties()')) {
    const applyPluginIndex = buildGradleContent.indexOf('apply plugin');
    const applyPluginEndIndex = buildGradleContent.indexOf('\n', applyPluginIndex) + 1;
    buildGradleContent = buildGradleContent.slice(0, applyPluginEndIndex) +
      `
Properties localProperties = new Properties()
File localPropertiesFile = rootProject.file('local.properties')
if (localPropertiesFile.exists()) {
    localProperties.load(new FileInputStream(localPropertiesFile))
}
` + buildGradleContent.slice(applyPluginEndIndex);
  }

  if (!buildGradleContent.includes('signingConfigs {')) {
    const signingConfigsIndex = buildGradleContent.indexOf('signingConfigs {');
    const signingConfigsEndIndex = buildGradleContent.indexOf('}', signingConfigsIndex) + 1;
    buildGradleContent = buildGradleContent.slice(0, signingConfigsEndIndex) +
      `
    release {
      if (localProperties.getProperty('RELEASE_STORE_FILE')) {
        storeFile file(localProperties.getProperty('RELEASE_STORE_FILE'))
        storePassword localProperties.getProperty('RELEASE_STORE_PASSWORD')
        keyAlias localProperties.getProperty('RELEASE_KEY_ALIAS')
        keyPassword localProperties.getProperty('RELEASE_KEY_PASSWORD')
      }
    }
` + buildGradleContent.slice(signingConfigsEndIndex);
  }

  if (!buildGradleContent.includes('buildTypes {')) {
    const buildTypesIndex = buildGradleContent.indexOf('buildTypes {');
    const buildTypesEndIndex = buildGradleContent.indexOf('}', buildTypesIndex) + 1;
    buildGradleContent = buildGradleContent.slice(0, buildTypesEndIndex) +
      `
    release {
      signingConfig signingConfigs.release
    }
` + buildGradleContent.slice(buildTypesEndIndex);
  }

  fs.writeFileSync(buildGradlePath, buildGradleContent);

  console.log('Keystore setup completed.');
}

module.exports = { setupKeystore };
