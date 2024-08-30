# 🧙‍♂️ Salabim CLI ✨

**Sim Salabim faz o trabalho pra mim**

**Salabim CLI** é um helper CLI para projetos pessoais. Ele fornece alguns comandos para configurar rapidamente diversos aspectos de qualidade de código e automação para projetos React, React-Native e Node.js.

## 🚀 Instalação

Para instalar o Salabim CLI, primeiro você precisa instalá-lo globalmente usando npm:

```
npm install -g @salabim/salabim-cli
```

## 📚 Comandos Disponíveis


### `--version` ou `-v` 📖

Exibe a versão atual do Salabim CLI.

#### Uso

```
salabim --version 
```



### `setup-keystore` 🔑

Configura o keystore para projetos Android. Este comando cria um keystore e atualiza o arquivo `build.gradle` com as informações necessárias.

#### Uso

```
salabim setup-keystore
```


### `setup-fastlane` 🚀

Configura o Fastlane para projetos Android. Este comando instala o Fastlane, cria os arquivos de configuração e adiciona os scripts necessários ao `package.json`.

#### Uso

```
salabim setup-fastlane
```

### `setup-cspell` 🔍

Configura o Cspell para o projeto. Este comando instala o Cspell, cria o arquivo de configuração `cspell.json` e sugere extensões para o VSCode.

#### Uso

```
salabim setup-cspell
```


### `setup-linting` 🛠️

Configura o ESLint e Prettier para o projeto. Este comando instala as dependências necessárias e configura os arquivos de configuração do ESLint e Prettier.

#### Uso

```
salabim setup-linting
```

### `setup-code-quality` ✔️

Configura o lint-staged, commitlint e husky para o projeto. Este comando instala as dependências necessárias, cria os arquivos de configuração e adiciona os hooks do husky.

#### Uso

```
salabim setup-code-quality
```


### `setup-alias-path` 📚

Configura o TypeScript para o projeto. Este comando instala o TypeScript e configura o alias path `@/*` e `@/tests/*`.

#### Uso

```
salabim setup-alias-path
```


### `setup-environment-config` 📦

Configura o suporte a variáveis de ambiente no projeto. Este comando cria o arquivo `.env` e sugere variáveis de ambiente.

#### Uso

```
salabim setup-environment-config
```


## 🤝 Contribuição

Sinta-se à vontade para contribuir com este projeto. Envie PRs ou abra issues no GitHub.
