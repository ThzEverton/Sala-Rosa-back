# Sala Rosa — Backend

API do sistema **Sala Rosa**, responsável pelas regras de negócio de agenda, agendamentos, vendas, financeiro e autenticação.

Frontend relacionado: [`Front-end-`](https://github.com/ThzEverton/Front-end-)

## Stack

- Node.js
- Express 5
- MySQL
- JWT
- Swagger
- bcrypt
- whatsapp-web.js

## Arquitetura

```text
Routes
  ↓
Controllers
  ↓
Services
  ↓
Repositories
  ↓
MySQL
```

Entidades e middlewares complementam as camadas de domínio, validação e segurança.

## Regras de agendamento

O domínio usa controle por **slots de tempo** para evitar conflitos de agenda.

- Agendamento `individual`: confirmação direta.
- Agendamento `turma`: depende de aprovação.
- Horários configurados, exceções e bloqueios são validados.
- Slots podem estar disponíveis, ocupados ou bloqueados.
- Cancelamentos atualizam o status e liberam os slots.

Durações atualmente consideradas:

- individual: 1 hora
- turma: 2 horas

## Autenticação

A API utiliza JWT, recebido pelo header `Authorization: Bearer <token>` ou por cookie conforme o fluxo da aplicação.

## Documentação da API

O projeto possui geração e interface Swagger por meio de `swagger-autogen` e `swagger-ui-express`.

## Executando localmente

1. Configure as variáveis de ambiente e a conexão MySQL.
2. Instale as dependências.
3. Inicie a aplicação.

```bash
npm install
npm start
```
