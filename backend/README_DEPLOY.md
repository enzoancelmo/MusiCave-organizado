# Roteiro Do Backend Para Deploy

Este arquivo lista o que ainda precisa ser feito para deixar o backend do MusiCave pronto para deploy em producao.

## 1. Escolher Onde Vai Hospedar

Definir a plataforma de deploy:

- Render
- Railway
- Fly.io
- VPS
- outro servidor escolhido pelo grupo

O backend Node precisa rodar com:

```bash
npm install
npm start
```

O servidor usa a porta definida por `PORT`, entao a plataforma precisa conseguir passar essa variavel automaticamente ou pelo painel.

## 2. Criar Banco PostgreSQL Em Producao

Nao usar o banco local do Docker em producao.

Criar um PostgreSQL na plataforma escolhida ou em servico externo, como:

- Railway PostgreSQL
- Render PostgreSQL
- Supabase
- Neon
- banco em VPS

Depois pegar os dados de conexao:

```text
POSTGRES_HOST
POSTGRES_PORT
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
```

## 3. Configurar Variaveis De Ambiente

No painel da hospedagem, cadastrar:

```text
PORT=3000
POSTGRES_HOST=...
POSTGRES_PORT=5432
POSTGRES_DB=...
POSTGRES_USER=...
POSTGRES_PASSWORD=...
NODE_ENV=production
```

Nunca colocar senha real do banco dentro do codigo.

## 4. Rodar Schema Do Banco

Antes de testar o site em producao, aplicar:

```text
database/schema.sql
```

O seed e opcional:

```text
database/seed.sql
```

Usar o seed apenas se quiser dados de demonstracao no ambiente publicado.

## 5. Revisar CORS

Hoje o backend aceita qualquer origem com `cors()`.

Antes do deploy final, definir quais dominios podem acessar a API.

Exemplo esperado:

```text
https://seudominio.com
https://www.seudominio.com
```

## 6. Melhorar Autenticacao

Hoje o login gera um token aleatorio, mas ele nao e salvo nem validado em rotas protegidas.

Para deploy real, falta:

- usar JWT ou sessoes;
- criar uma chave secreta por variavel de ambiente;
- proteger rotas que precisam de usuario logado;
- criar middleware de autenticacao;
- definir tempo de expiracao do token.

Variavel sugerida:

```text
JWT_SECRET=uma_chave_forte
```

## 7. Criar `.env.example`

Criar um arquivo de exemplo para o grupo saber quais variaveis configurar:

```text
PORT=3000
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=musicave
POSTGRES_USER=musicave
POSTGRES_PASSWORD=musicave
NODE_ENV=development
JWT_SECRET=troque_essa_chave
```

Nao commitar `.env` real.

## 8. Adicionar Segurança Basica

Antes do deploy, instalar e configurar:

- `helmet`
- limite de requisicoes para login/cadastro
- mensagens de erro sem detalhes internos
- limite de tamanho para upload de capa

Hoje o backend aceita JSON de ate `50mb`, por causa das capas em base64. Para producao, o ideal e reduzir isso ou salvar imagens em storage externo.

## 9. Decidir Como Salvar Capas

Hoje a capa do album e salva como texto/base64 no banco.

Para TCC pode funcionar, mas para producao real o ideal seria:

- salvar imagem em storage;
- guardar no banco apenas a URL da imagem.

Opcoes:

- Cloudinary
- Supabase Storage
- S3
- pasta local em VPS

## 10. Criar Dockerfile Opcional

Se a plataforma usar Docker, criar:

```text
Dockerfile
```

Ele deve:

- instalar dependencias;
- copiar backend, frontend, package.json e database;
- rodar `npm start`;
- expor a porta do app.

## 11. Testar Endpoints Antes Do Deploy

Testar localmente:

```text
GET    /api/health
GET    /api/albums
POST   /api/albums
PUT    /api/albums/:id
DELETE /api/albums/:id
POST   /api/register
POST   /api/login
```

O endpoint mais importante para healthcheck e:

```text
/api/health
```

## 12. Checklist Final Para Deploy

- [ ] Plataforma de hospedagem escolhida
- [ ] Banco PostgreSQL de producao criado
- [ ] Variaveis de ambiente configuradas
- [ ] `database/schema.sql` aplicado no banco
- [ ] Seed aplicado apenas se for ambiente demonstrativo
- [ ] CORS limitado ao dominio oficial
- [ ] Autenticacao com token validavel
- [ ] `.env.example` criado
- [ ] Segurança basica adicionada
- [ ] Estrategia de upload/capa definida
- [ ] Healthcheck testado
- [ ] Rotas principais testadas
- [ ] Deploy feito
- [ ] URL final testada no navegador

## Resumo

O backend ja esta organizado em modulos e integrado ao PostgreSQL. Para deploy, o que mais falta e preparar ambiente de producao: banco hospedado, variaveis de ambiente, seguranca, autenticacao validavel e testes das rotas.
