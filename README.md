# MusiCave

MusiCave e um sistema web para cadastrar albuns, avaliar faixas por criterios musicais e classificar cada album em tiers.

## Tecnologias

- HTML, CSS e JavaScript no frontend
- Node.js com Express no backend
- PostgreSQL para persistencia
- Docker Compose para subir Postgres e Adminer

## Como rodar

1. Instale as dependencias:

```bash
npm install
```

2. Suba o banco de dados:

```bash
docker compose up -d
```

Se sua instalacao usar o comando antigo do Docker Compose:

```bash
docker-compose up -d
```

3. Inicie o servidor:

```bash
npm start
```

4. Abra o sistema:

```text
http://localhost:3000
```

## URLs uteis

- Aplicacao: `http://localhost:3000`
- API de saude: `http://localhost:3000/api/health`
- Adminer: `http://localhost:8080`

## Banco de dados no Adminer

- Sistema: PostgreSQL
- Servidor: `db`
- Usuario: `musicave`
- Senha: `musicave`
- Banco: `musicave`

## Organizacao

```text
musicave/
  backend/
    app.js           # configuracao do Express, middlewares e rotas
    server.js        # inicializacao do servidor
    entrar.js        # compatibilidade: encaminha para o servidor principal
    config/          # variaveis de ambiente e caminhos
    controllers/     # regras das requisicoes HTTP
    db/              # conexao e inicializacao do banco
    routes/          # rotas da API
    utils/           # funcoes auxiliares
  frontend/
    index.html       # pagina inicial
    tiers.html       # tela de cadastro, avaliacao e tier list
    entrar.html      # login e cadastro
    sobre.html       # equipe/sobre o projeto
    contato.html     # contato
    cadastro.html    # redireciona para entrar.html
    css/
      style.css      # estilos do site
    js/
      script.js      # logica da tela de tiers
    assets/
      imagens, video e arquivos visuais
  database/
    schema.sql       # estrutura oficial do banco
    seed.sql         # dados iniciais
    verification.sql # consultas de conferencia
    README.md        # documentacao do banco e DER
    migrations/      # historico de criacao/evolucao do banco
  docker-compose.yml # Postgres e Adminer
  package.json       # scripts e dependencias Node
  scripts/           # utilitarios do projeto
```

## API principal

- `GET /api/health`
- `GET /api/albums`
- `POST /api/albums`
- `PUT /api/albums/:id`
- `DELETE /api/albums/:id`
- `POST /api/register`
- `POST /api/login`

## Documentacao do banco

A parte de banco esta documentada em `database/README.md`, incluindo DER, cardinalidades, regras de integridade, seed e consultas de verificacao.

## Comandos

```bash
npm start
npm run check
```
