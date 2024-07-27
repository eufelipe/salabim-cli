const shell = require('shelljs');
const fs = require('fs');
const path = require('path');
const prompts = require('prompts');

async function setupKeystore() {
  const androidPath = path.join(process.cwd(), 'android');
  const appPath = path.join(androidPath, 'app');
  const keystorePath = path.join(appPath, 'app.keystore');
  const buildGradlePath = path.join(appPath, 'build.gradle');
  const gitignorePath = path.join(process.cwd(), '.gitignore');

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
        validate: value => value.length >= 6 ? true : 'Password must be at least 6 characters',
        initial: Math.random().toString(36).slice(-8)
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
  const generateKeystoreCmd = `keytool -genkey -v -keystore ${path.join(appPath, answers.keystoreName)} -alias ${answers.alias} -keyalg RSA -keysize 2048 -validity 10000 -storepass ${answers.storePassword} -keypass ${answers.storePassword} -dname "${answers.dname}" -storetype pkcs12`;
  
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
RELEASE_KEY_PASSWORD=${answers.storePassword}
`;
  fs.writeFileSync(localPropertiesPath, localPropertiesContent);

  // Ensure build.gradle exists
  if (!fs.existsSync(buildGradlePath)) {
    fs.writeFileSync(buildGradlePath, '');
  }

  // Read the current build.gradle content
  let buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');

  // Extract current applicationId
  const applicationIdMatch = buildGradleContent.match(/applicationId\s+"([^"]+)"/);
  const applicationId = applicationIdMatch ? applicationIdMatch[1] : 'com.example.app';

  // Add local.properties loading block after the last apply plugin
  const applyPluginRegex = /^apply plugin:.*$/gm;
  let match;
  let lastApplyPluginIndex = -1;
  while ((match = applyPluginRegex.exec(buildGradleContent)) !== null) {
    lastApplyPluginIndex = match.index + match[0].length;
  }
  if (lastApplyPluginIndex !== -1) {
    buildGradleContent = buildGradleContent.slice(0, lastApplyPluginIndex) +
      '\n\nProperties localProperties = new Properties()\n' +
      'File localPropertiesFile = rootProject.file(\'local.properties\')\n' +
      'if (localPropertiesFile.exists()) {\n' +
      '    localProperties.load(new FileInputStream(localPropertiesFile))\n' +
      '}\n\n' +
      buildGradleContent.slice(lastApplyPluginIndex);
  }

  // Function to remove nested blocks
  function removeNestedBlock(content, blockName) {
    const regex = new RegExp(`${blockName}\\s*{[^{}]*({[^{}]*}[^{}]*)*}`, 'gs');
    return content.replace(regex, '');
  }

  // Remove existing signingConfigs, buildTypes, and defaultConfig blocks
  buildGradleContent = removeNestedBlock(buildGradleContent, 'signingConfigs');
  buildGradleContent = removeNestedBlock(buildGradleContent, 'buildTypes');
  buildGradleContent = removeNestedBlock(buildGradleContent, 'defaultConfig');

  // Add new defaultConfig block with the current applicationId
  const defaultConfigReplacement = `
defaultConfig {
    applicationId "${applicationId}"
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 1
    versionName "1.0"
}`;

  // Add new signingConfigs block
  const signingConfigsReplacement = `
signingConfigs {
    release {
        if (localProperties.getProperty('RELEASE_STORE_FILE')) {
            storeFile file(localProperties.getProperty('RELEASE_STORE_FILE'))
            storePassword localProperties.getProperty('RELEASE_STORE_PASSWORD')
            keyAlias localProperties.getProperty('RELEASE_KEY_ALIAS')
            keyPassword localProperties.getProperty('RELEASE_KEY_PASSWORD')
        }
    }
    debug {
        storeFile file('debug.keystore')
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
}`;

  // Add new buildTypes block
  const buildTypesReplacement = `
buildTypes {
    debug {
        signingConfig signingConfigs.debug
    }
    release {
        signingConfig signingConfigs.release
        minifyEnabled enableProguardInReleaseBuilds
        proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
    }
}`;

  // Ensure new blocks are added inside the android block correctly
  const androidBlockRegex = /android\s*{([^}]*)}/s;
  buildGradleContent = buildGradleContent.replace(androidBlockRegex, (match, group) => {
    // Add new blocks to the end of the android block
    return `android {\n${group.trim()}\n\n${defaultConfigReplacement}\n\n${signingConfigsReplacement}\n\n${buildTypesReplacement}\n}`;
  });

  fs.writeFileSync(buildGradlePath, buildGradleContent);

  console.log('Keystore setup completed.');

  // Ask if you want to commit
  const commitAnswer = await prompts({
    type: 'confirm',
    name: 'commit',
    message: 'Do you want to commit the changes?',
    initial: true
  });

  if (commitAnswer.commit) {
    // Check if .gitignore exists and add entries if necessary
    let gitignoreContent = '';
    if (fs.existsSync(gitignorePath)) {
      gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    } else {
      fs.writeFileSync(gitignorePath, '');
    }

    if (!gitignoreContent.includes('local.properties')) {
      gitignoreContent += '\nlocal.properties\n';
    }

    if (!gitignoreContent.includes('*.keystore')) {
      gitignoreContent += '\n*.keystore\n';
    }

    fs.writeFileSync(gitignorePath, gitignoreContent);

    // Commit the changes
    shell.exec('git add android/app/build.gradle');
    if (gitignoreContent) {
      shell.exec('git add .gitignore');
    }

    shell.exec('git commit -m "chore: setup keystore and update build.gradle and .gitignore"');

    console.log('Changes committed successfully.');
  }
}

module.exports = { setupKeystore };
