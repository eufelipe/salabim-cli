const shell = require("shelljs");
const fs = require("fs");
const path = require("path");
const prompts = require("prompts");

async function setupEnvironmentConfig() {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const buildGradlePath = path.join(process.cwd(), "android", "app", "build.gradle");
  const podfilePath = path.join(process.cwd(), "ios", "Podfile");
  const envPath = path.join(process.cwd(), ".env");
  const gitignorePath = path.join(process.cwd(), ".gitignore");
  const constantsDir = path.join(process.cwd(), "src", "constants");
  const environmentsTsPath = path.join(constantsDir, "environments.ts");
  let packageManager = "";

  // Detect package manager
  if (fs.existsSync(path.join(process.cwd(), "yarn.lock"))) {
    packageManager = "yarn";
  } else if (fs.existsSync(path.join(process.cwd(), "package-lock.json"))) {
    packageManager = "npm";
  } else if (fs.existsSync(path.join(process.cwd(), "pnpm-lock.yaml"))) {
    packageManager = "pnpm";
  } else {
    console.error("No lock file found. Please use npm, yarn, or pnpm.");
    process.exit(1);
  }

  // Install react-native-config
  const installCommand = {
    yarn: `yarn add react-native-config`,
    npm: `npm install react-native-config`,
    pnpm: `pnpm add react-native-config`,
  };

  if (shell.exec(installCommand[packageManager]).code !== 0) {
    console.error("Failed to install react-native-config.");
    process.exit(1);
  }

  // Configure Android build.gradle
  if (fs.existsSync(buildGradlePath)) {
    let buildGradleContent = fs.readFileSync(buildGradlePath, "utf8");

    if (!buildGradleContent.includes("dotenv.gradle")) {
      buildGradleContent += `
apply from: project(':react-native-config').projectDir.getPath() + "/dotenv.gradle"
`;

      fs.writeFileSync(buildGradlePath, buildGradleContent);
      console.log("Android build.gradle configured successfully.");
    }
  } else {
    console.error("build.gradle not found.");
  }

  // Create .env file with examples
  if (!fs.existsSync(envPath)) {
    const envContent = `API_URL=https://site.com\nAPP_NAME=AwesomeApp\n`;
    fs.writeFileSync(envPath, envContent);
    console.log(".env file created successfully.");
  }

  // Check and update .gitignore
  if (fs.existsSync(gitignorePath)) {
    let gitignoreContent = fs.readFileSync(gitignorePath, "utf8");

    if (!gitignoreContent.includes("*.env")) {
      gitignoreContent += "\n*.env\n";
      fs.writeFileSync(gitignorePath, gitignoreContent);
      console.log(".gitignore updated to ignore .env files.");
    }
  } else {
    fs.writeFileSync(gitignorePath, "*.env\n");
    console.log(".gitignore created and updated to ignore .env files.");
  }

  // Ask if the user wants to configure multiple environment files
  const { configureMultipleEnvs } = await prompts({
    type: "confirm",
    name: "configureMultipleEnvs",
    message: "Do you want to configure multiple environment files?",
    initial: true,
  });

  if (configureMultipleEnvs) {
    const { environments } = await prompts({
      type: "list",
      name: "environments",
      message: "Which environments do you want to configure?",
      initial: "production,development,staging",
      separator: ",",
    });

    environments.forEach((env) => {
      const envFilePath = path.join(process.cwd(), `.env.${env}`);
      const envFileContent = `API_URL=https://${env}.site.com\nAPP_NAME=AwesomeApp\n`;
      fs.writeFileSync(envFilePath, envFileContent);
      console.log(`.env.${env} file created successfully.`);
    });
  }

  // Configure iOS Podfile for multiple environments
  if (fs.existsSync(podfilePath)) {
    let podfileContent = fs.readFileSync(podfilePath, "utf8");

    if (!podfileContent.includes("ReactNativeConfig.dotenv")) {
      const envFileSnippet = `
env_file = File.join(File.dirname(__FILE__), '..', 'node_modules', 'react-native-config', 'ios', 'react-native-config.podspec')
if File.exist?(env_file)
  require env_file
  ReactNativeConfig.dotenv = '.env'
end
`;

      podfileContent += envFileSnippet;
      fs.writeFileSync(podfilePath, podfileContent);
      console.log("iOS Podfile configured successfully.");
    }
  } else {
    console.error("Podfile not found.");
  }

  // Update Android build.gradle for multiple environments
  if (fs.existsSync(buildGradlePath)) {
    let buildGradleContent = fs.readFileSync(buildGradlePath, "utf8");

    const newBuildGradleContent = buildGradleContent.replace(
      /apply from: project\(':react-native-config'\)\.projectDir\.getPath\(\) \+ "\/dotenv\.gradle"/g,
      `project.ext.envfile = project.hasProperty('envfile') ? project.envfile : '.env'
apply from: project(':react-native-config').projectDir.getPath() + "/dotenv.gradle"`
    );

    fs.writeFileSync(buildGradlePath, newBuildGradleContent);
    console.log("Android build.gradle updated for multiple environments.");
  }

  // Update package.json scripts
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    packageJson.scripts = {
      ...packageJson.scripts,
      "start": "react-native start",
      "start:dev": "ENVFILE=.env.development react-native start",
      "start:prod": "ENVFILE=.env.production react-native start",
      "start:staging": "ENVFILE=.env.staging react-native start",
      "android": "ENVFILE=.env.development react-native run-android",
      "android:dev": "ENVFILE=.env.development react-native run-android",
      "android:prod": "ENVFILE=.env.production react-native run-android",
      "android:staging": "ENVFILE=.env.staging react-native run-android",
      "ios": "ENVFILE=.env.development react-native run-ios",
      "ios:dev": "ENVFILE=.env.development react-native run-ios",
      "ios:prod": "ENVFILE=.env.production react-native run-ios",
      "ios:staging": "ENVFILE=.env.staging react-native run-ios",
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log("package.json scripts updated for multiple environments.");
  }

  // Create environments.ts file
  if (!fs.existsSync(constantsDir)) {
    fs.mkdirSync(constantsDir, { recursive: true });
  }

  const environmentsTsContent = `
import Config from "react-native-config";

const API_URL = Config.API_URL!;
const APP_NAME = Config.APP_NAME!;

export { API_URL, APP_NAME };
`;

  fs.writeFileSync(environmentsTsPath, environmentsTsContent);
  console.log("environments.ts file created successfully.");

  // Run pod-install for iOS
  if (shell.exec("npx pod-install").code !== 0) {
    console.error("Failed to install iOS dependencies.");
    process.exit(1);
  }

  // Ask if the user wants to commit the changes
  const commitAnswer = await prompts({
    type: "confirm",
    name: "commit",
    message: "Do you want to commit the setup changes?",
    initial: true,
  });

  // Commit the setup changes
  if (commitAnswer.commit) {
    shell.exec("git add .env* android/app/build.gradle ios/Podfile src/constants/environments.ts package.json .gitignore");
    shell.exec('git commit -m "chore: setup environment configuration with react-native-config and multiple environments"');

    console.log("Changes committed successfully.");
  }

  console.log("Environment configuration setup completed successfully.");
}

module.exports = { setupEnvironmentConfig };
