const shell = require('shelljs');
const fs = require('fs');
const path = require('path');
const prompts = require('prompts');

async function setupFastlane() {
  const androidPath = path.join(process.cwd(), 'android');
  const iosPath = path.join(process.cwd(), 'ios');
  const distPath = path.join(process.cwd(), 'dist');
  const fastlanePath = path.join(process.cwd(), 'fastlane');
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const gemfilePath = path.join(process.cwd(), 'Gemfile');

  // Ensure android and ios directories exist
  if (!fs.existsSync(androidPath) || !fs.existsSync(iosPath)) {
    console.error('Android and iOS directories must exist.');
    process.exit(1);
  }

  // Check if bundle is installed
  if (shell.exec('bundle --version', { silent: true }).code !== 0) {
    console.error('Bundler is not installed. Please install it with `gem install bundler`.');
    process.exit(1);
  }

  // Update or create Gemfile
  let gemfileContent = '';
  if (fs.existsSync(gemfilePath)) {
    gemfileContent = fs.readFileSync(gemfilePath, 'utf8');
  } else {
    fs.writeFileSync(gemfilePath, '');
  }

  if (!gemfileContent.includes("gem 'fastlane'")) {
    gemfileContent += `\nsource 'https://rubygems.org'\n\nruby ">= 2.6.10"\n\ngem 'cocoapods', '>= 1.13', '< 1.15'\ngem 'activesupport', '>= 6.1.7.5', '< 7.1.0'\ngem 'fastlane'\n`;
    fs.writeFileSync(gemfilePath, gemfileContent);
  }

  // Run bundle install
  shell.exec('bundle install');

  // Create dist directory with .gitkeep
  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath);
  }
  fs.writeFileSync(path.join(distPath, '.gitkeep'), '');

  // Initialize fastlane
  if (!fs.existsSync(fastlanePath)) {
    fs.mkdirSync(fastlanePath);
  }
  shell.exec('bundle exec fastlane update_fastlane');

  // Create Fastfile
  const fastfilePath = path.join(fastlanePath, 'Fastfile');
  const fastfileContent = `
fastlane_version "2.71.1"
default_platform(:android)

platform :android do

  def build_and_copy(task, extension, output_dir)
    project_dir = "android"
    gradlew_path = "gradlew"

    gradle(
      project_dir: project_dir,
      gradle_path: gradlew_path,
      task: task,
      build_type: "Release",
      print_command: true
    )

    current_dir = Dir.pwd  
    build_dir = "#{current_dir}/../#{project_dir}/app/build/outputs/#{output_dir}/release"
    build_file = "#{build_dir}/app-release.#{extension}"

    unless File.exist?(build_file)
      UI.user_error!("Não foi possível encontrar o arquivo .#{extension} em #{build_file}. Verifique se a construção do projeto foi concluída com sucesso.")
    end

    dist_dir = "#{current_dir}/../dist"

    config_path = "../src/constants/version.ts"
    config_file = File.read(config_path)

    version = /export const VERSION = '(.*)';/.match(config_file)[1]

    sh("cp -r #{build_file} #{dist_dir}/app-#{version}-release.#{extension}")
  end

  lane :build_android_apk do
    build_and_copy("assemble", "apk", "apk")
  end

  lane :build_android_aab do
    build_and_copy("bundle", "aab", "bundle")
  end
end
`;
  if (fs.existsSync(fastfilePath)) {
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: 'Fastfile already exists. Do you want to overwrite it?',
      initial: false
    });
    if (overwrite) {
      fs.writeFileSync(fastfilePath, fastfileContent);
    }
  } else {
    fs.writeFileSync(fastfilePath, fastfileContent);
  }

  // Update .gitignore
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

  if (!gitignoreContent.includes('dist/*.apk')) {
    gitignoreContent += '\ndist/*.apk\n';
  }

  if (!gitignoreContent.includes('dist/*.aab')) {
    gitignoreContent += '\ndist/*.aab\n';
  }

  if (!gitignoreContent.includes('dist/*.ipa')) {
    gitignoreContent += '\ndist/*.ipa\n';
  }

  if (!gitignoreContent.includes('dist/*.md')) {
    gitignoreContent += '\ndist/*.md\n';
  }

  fs.writeFileSync(gitignorePath, gitignoreContent);

  // Update package.json scripts
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.scripts = {
    ...packageJson.scripts,
    'build:android:apk': 'bundle exec fastlane android build_android_apk',
    'build:android:aab': 'bundle exec fastlane android build_android_aab'
  };
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Create src/constants/version.ts if it doesn't exist
  const constantsPath = path.join(process.cwd(), 'src', 'constants');
  const versionTsPath = path.join(constantsPath, 'version.ts');
  if (!fs.existsSync(constantsPath)) {
    fs.mkdirSync(constantsPath, { recursive: true });
  }
  if (!fs.existsSync(versionTsPath)) {
    fs.writeFileSync(versionTsPath, `export const VERSION = '1.0.0';\n`);
  }

  // Ask if you want to commit
  const commitAnswer = await prompts({
    type: 'confirm',
    name: 'commit',
    message: 'Do you want to commit the changes?',
    initial: true
  });


  // Commit the changes
  if (commitAnswer.commit) {
    shell.exec('git add .gitignore');
    shell.exec('git add dist/.gitkeep');
    shell.exec('git add Gemfile');
    shell.exec('git add Gemfile.lock');
    shell.exec('git add package.json');
    shell.exec('git add fastlane/Fastfile');
    shell.exec('git add src/constants/version.ts');
    shell.exec('git commit -m "chore: setup Fastlane and update project files"');

    console.log('Changes committed successfully.');
  }
}

module.exports = { setupFastlane };
