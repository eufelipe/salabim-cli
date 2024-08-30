const shell = require("shelljs");
const fs = require("fs");
const path = require("path");
const prompts = require("prompts");

async function setupTypeScript() {
  const tsconfigPath = path.join(process.cwd(), "tsconfig.json");
  const tsconfigSpecPath = path.join(process.cwd(), "tsconfig.spec.json");
  const babelConfigPath = path.join(process.cwd(), "babel.config.js");
  
  let packageManager = "";

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

  const tsInstallCommand = {
    yarn: `yarn add -D typescript@5.5.4`,
    npm: `npm install -D typescript@5.5.4`,
    pnpm: `pnpm add -D typescript@5.5.4`,
  };

  if (shell.exec(tsInstallCommand[packageManager]).code !== 0) {
    console.error("Failed to install TypeScript dependencies.");
    process.exit(1);
  }

  const tsconfigContent = {
    extends: "@react-native/typescript-config/tsconfig.json",
    compilerOptions: {
      target: "esnext",
      module: "es2015",
      lib: [
        "es2019",
        "es2020.bigint",
        "es2020.date",
        "es2020.number",
        "es2020.promise",
        "es2020.string",
        "es2020.symbol.wellknown",
        "es2021.promise",
        "es2021.string",
        "es2021.weakref",
        "es2022.array",
        "es2022.object",
        "es2022.string",
      ],
      jsx: "react-native",
      strict: true,
      noEmit: true,
      isolatedModules: true,
      moduleResolution: "bundler",
      baseUrl: ".",
      paths: {
        "@/*": ["src/*"],
        "@tests/*": ["tests/*"],
      },
      rootDirs: ["src", "tests"],
      allowJs: true,
      resolveJsonModule: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      allowImportingTsExtensions: true,
      allowArbitraryExtensions: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: false,
      experimentalDecorators: true,
      customConditions: ["react-native"],
      resolvePackageJsonImports: false,
      types: ["react-native", "jest"],
    },
    include: ["src"],
  };

  if (fs.existsSync(tsconfigPath)) {
    const { overwrite } = await prompts({
      type: "confirm",
      name: "overwrite",
      message: "tsconfig.json already exists. Do you want to overwrite it?",
      initial: false,
    });

    if (overwrite) {
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfigContent, null, 2));
    }
  } else {
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfigContent, null, 2));
  }

  // Install Babel dependencies
  const babelInstallCommand = {
    yarn: `yarn add -D @babel/plugin-proposal-decorators @babel/plugin-transform-class-static-block @babel/plugin-transform-private-property-in-object @babel/preset-typescript babel-plugin-module-resolver babel-plugin-optional-require`,
    npm: `npm install -D @babel/plugin-proposal-decorators @babel/plugin-transform-class-static-block @babel/plugin-transform-private-property-in-object @babel/preset-typescript babel-plugin-module-resolver babel-plugin-optional-require`,
    pnpm: `pnpm add -D @babel/plugin-proposal-decorators @babel/plugin-transform-class-static-block @babel/plugin-transform-private-property-in-object @babel/preset-typescript babel-plugin-module-resolver babel-plugin-optional-require`,
  };

  if (shell.exec(babelInstallCommand[packageManager]).code !== 0) {
    console.error("Failed to install Babel dependencies.");
    process.exit(1);
  }

  const babelConfigContent = `
module.exports = {
  presets: ["module:@react-native/babel-preset", "@babel/preset-typescript"],
  plugins: [
    ["@babel/plugin-proposal-decorators", { version: "2023-11" }],
    ["@babel/plugin-transform-class-static-block"],
    [
      "module-resolver",
      {
        root: ["./src"],
        alias: {
          "@": "./src",
          "@tests": "./tests"
        }
      }
    ],
    "optional-require"
  ]
};
`;

  if (fs.existsSync(babelConfigPath)) {
    const { overwrite } = await prompts({
      type: "confirm",
      name: "overwrite",
      message: "babel.config.js already exists. Do you want to overwrite it?",
      initial: false,
    });

    if (overwrite) {
      fs.writeFileSync(babelConfigPath, babelConfigContent);
    }
  } else {
    fs.writeFileSync(babelConfigPath, babelConfigContent);
  }

  const tsconfigSpecContent = {
    extends: "./tsconfig.json",
    compilerOptions: {
      jsx: "react-jsx",
    },
  };

  if (fs.existsSync(tsconfigSpecPath)) {
    const { overwrite } = await prompts({
      type: "confirm",
      name: "overwrite",
      message: "tsconfig.spec.json already exists. Do you want to overwrite it?",
      initial: false,
    });

    if (overwrite) {
      fs.writeFileSync(tsconfigSpecPath, JSON.stringify(tsconfigSpecContent, null, 2));
    }
  } else {
    fs.writeFileSync(tsconfigSpecPath, JSON.stringify(tsconfigSpecContent, null, 2));
  }


  const commitAnswer = await prompts({
    type: "confirm",
    name: "commit",
    message: "Do you want to commit the setup changes?",
    initial: true,
  });

  if (commitAnswer.commit) {
    shell.exec("git add tsconfig.json tsconfig.spec.json babel.config.js package.json");
    shell.exec('git commit -m "chore: setup TypeScript with alias paths and Babel configuration"');

    console.log("Changes committed successfully.");
  }
}

module.exports = { setupTypeScript };
