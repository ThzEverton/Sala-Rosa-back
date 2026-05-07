# Sala Rosa - Contexto do Projeto

Este arquivo existe para dar contexto rapido a qualquer assistente/desenvolvedor que abrir o projeto. Antes de alterar codigo, leia este arquivo e confira os arquivos citados.

## Caminhos

- Back-end: `C:\Users\Aluno\Desktop\back\Sala-Rosa-back`
- Front-end: `C:\Users\Aluno\Desktop\front\Front-end-`
- Escopo original em PDF: `C:\Users\Aluno\Desktop\escopo projeto.pdf`

## Objetivo

Sala Rosa e um sistema para gerenciar uma sala/negocio de beleza, com:

- usuarios clientes e gerente;
- agenda por horarios/slots;
- agendamentos individuais;
- turmas/workshops/treinamentos;
- servicos e produtos;
- vendas;
- estoque;
- financeiro;
- lembretes/disparos de WhatsApp.

## Stack

Back-end:

- Node.js com ES Modules;
- Express;
- MySQL;
- JWT;
- Swagger em `/docs`.

Front-end:

- Next.js App Router;
- React;
- JavaScript/JSX;
- Tailwind/CSS;
- `sonner` para toasts;
- `lucide-react` para icones.

## Como rodar

Back-end:

```bash
cd C:\Users\Aluno\Desktop\back\Sala-Rosa-back
npm install
npm start
```

O back sobe em `http://localhost:5000` por padrao.

Front-end:

```bash
cd C:\Users\Aluno\Desktop\front\Front-end-
npm install
npm run dev
```

O front normalmente usa `http://localhost:3000` e consome a API em `NEXT_PUBLIC_API_URL` ou `http://localhost:5000`.

## Usuarios e perfis

Tabela principal: `users`.

- `perfil = gerente`: usuario administrador/gerente. Ve tudo e gerencia cadastros, agenda, turmas, estoque, vendas e financeiro.
- `perfil = cliente`: usuario comum.
- `is_consultora`: cliente com acesso/participacao em servicos exclusivos para consultoras.
- O front identifica gerente em `context/userContext.jsx` por `user.perfil === 'gerente' || user.role === 'gerente'`.

## Autenticacao

- Login no front usa `POST /autenticacao/token`.
- Token salvo no `localStorage` como `sala_rosa_token`.
- Usuario salvo no `localStorage` como `sala_rosa_user`.
- `utils/apiClient.js` envia `Authorization: Bearer <token>`.
- Back usa `middlewares/authMiddleware.js` e popula `req.usuarioLogado`.

## Banco de dados

Arquivos:

- Schema: `db/schema.sql`
- Dados de teste: `db/dbteste.sql`

Principais tabelas:

- `users`
- `servicos`
- `produtos`
- `horario_config`
- `excecoes_dia`
- `bloqueios_slot`
- `agendamentos`
- `agendamento_participantes`
- `agendamento_slots`
- `vendas`
- `venda_itens`
- `estoque_movimentacoes`
- `financeiro_lancamentos`

## Regras importantes de agenda/agendamento

Agenda:

- Configuracao em `horario_config`.
- Slots do dia em `GET /agenda/slots?date=YYYY-MM-DD`.
- Bloqueios manuais em `bloqueios_slot`.
- Excecoes de dia/recorrentes em `excecoes_dia`.
- Um slot ocupado fica em `agendamento_slots` com `status = 'ativo'`.

Agendamento individual:

- Cliente cria para si com `POST /agendamentos`.
- Gerente cria para si ou para um cliente com `POST /agendamentos/gerente`.
- Quando gerente agenda para cliente:
  - `agendamentos.criado_por_user_id` deve ser o gerente;
  - `agendamento_participantes.user_id` deve ser o cliente escolhido;
  - listagens devem exibir o participante como cliente, nao o criador.
- Para cliente nao gerente, a listagem de `/agendamentos` deve filtrar por `agendamento_participantes.user_id`, nao por `criado_por_user_id`.

Turmas:

- Tipo `turma`.
- Podem ter `codigo_convite`, `capacidade_maxima` e varios participantes.
- Status comuns: `pendente_aprovacao`, `aprovado`, `recusado`, `cancelado`.
- Participantes ficam em `agendamento_participantes`.
- Regra de negocio: se uma turma ficar com exatamente 1 participante apos remocao feita pela gerente, o sistema deve pedir aprovacao da gerente antes de virar agendamento `individual`, com `capacidade_maxima = 1`, sem `codigo_convite` e status `confirmado` quando estava `aprovado`/`pendente_aprovacao`.
- Gerente pode adicionar uma cliente como participante pelo detalhe da turma; nesse caso o back deve usar `req.body.userId`, nao o usuario logado.

Cancelamento/remarcacao:

- Cancelar agendamento deve alterar `agendamentos.status` e cancelar/liberar seus slots em `agendamento_slots`.
- Remarcar deve validar conflito de slots, bloqueios, excecoes e horario configurado.

## Regras importantes de vendas

- Uma venda sempre precisa de ao menos um item e forma de pagamento.
- O vínculo é opcional:
  - sem vínculo: venda avulsa;
  - atendimento: usar `vendas.atendimento_id`;
  - cliente: usar `vendas.cliente_id`.
- `cliente_id` é nullable e referencia `users(id)`.
- Ao vender produto, o estoque deve baixar e criar `estoque_movimentacoes`.
- Toda venda cria/atualiza um lançamento em `financeiro_lancamentos`.

## Estrutura do back-end

Padrao usado:

- `routes/`: define endpoints.
- `controllers/`: valida request, usuario logado e regras de entrada.
- `repositories/`: SQL e transacoes.
- `entities/`: classes com getters/setters e `toJSON`.
- `db/`: conexao e transacao.

Rotas principais:

- `/autenticacao`
- `/users`
- `/servicos`
- `/produtos`
- `/agenda`
- `/agendamentos`
- `/turmas`
- `/vendas`
- `/estoque`
- `/financeiro`
- `/disparos`

Arquivos mais sensiveis para agenda:

- `controllers/agendaController.js`
- `repositories/agendaRepository.js`
- `controllers/agendamentosController.js`
- `repositories/agendamentosRepository.js`
- `controllers/turmasController.js`
- `repositories/turmasRepository.js`
- `entities/Agendamento.js`

Atencao: `entities/base.js` serializa apenas getters do prototype. Se adicionar um campo em entidade, crie getter/setter; senao o campo nao aparece no JSON da API.

## Estrutura do front-end

Pastas importantes:

- `app/page.jsx`: landing/publica.
- `app/login/page.jsx`: login.
- `app/cadastro/page.jsx`: cadastro publico.
- `app/logado/layout.jsx`: layout autenticado.
- `app/logado/dashboard/page.jsx`: dashboard.
- `app/logado/agenda/page.jsx`: grade de slots e criacao de agendamento.
- `app/logado/agendamentos/page.jsx`: lista/detalhes/remarcar/cancelar agendamentos.
- `app/logado/turmas/page.jsx`: turmas e participantes.
- `app/logado/cadastros/page.jsx`: usuarios, servicos e outros cadastros.
- `app/logado/vendas/page.jsx`: vendas.
- `app/logado/estoque/page.jsx`: estoque.
- `app/logado/financeiro/page.jsx`: financeiro.
- `components/DisparoEmMassa.jsx`: lembretes WhatsApp.
- `components/Sidebar.jsx`: navegacao por perfil.
- `utils/apiClient.js`: cliente HTTP.
- `utils/helpers.js`: formatacoes e status.
- `context/userContext.jsx`: estado global do usuario.

## Cuidados ao alterar

- Sempre verificar back e front juntos quando mexer em agendamento, cliente, turma ou status.
- Se um nome aparece errado no front, conferir primeiro o JSON retornado pelo back.
- Para agendamento criado por gerente, o cliente correto costuma estar em `participante`, nao em `criadoPor`.
- Manter nomes de campos aceitos pelo front: `servico`, `criadoPor`, `participante`, `horaInicio`, `clienteNome`, `status`.
- Evitar quebrar compatibilidade entre camelCase do front e snake_case do banco.
- Ao mexer no `apiClient`, lembrar que erros do back normalmente usam `{ msg: "..." }`.

## Verificacoes uteis

Back:

```bash
node --check controllers/agendaController.js
node --check repositories/agendaRepository.js
node --check repositories/agendamentosRepository.js
node --check entities/Agendamento.js
```

Front:

```bash
npm run lint
npm run build
```

Se o PowerShell bloquear `npm.ps1`, usar:

```bash
npm.cmd run lint
npm.cmd run build
```

## Correcao recente importante

Problema: gerente agendava para Bianca Rocha, mas a tela mostrava Administrador.

Causa:

- O banco salvava o participante corretamente em `agendamento_participantes`.
- A entidade `Agendamento` nao tinha getter/setter `participante`, entao `toJSON()` nao enviava `participante` na API.
- O front caia no fallback `criadoPor`, mostrando o gerente/Administrador.

Arquivos ajustados:

- `entities/Agendamento.js`: adiciona `participante`.
- `repositories/agendamentosRepository.js`: lista por `ap.user_id` para cliente e retorna dados do participante.
- `repositories/agendaRepository.js` e `controllers/agendaController.js`: slots ocupados retornam dados do cliente.
- Front `app/logado/agenda/page.jsx`: gerente seleciona apenas clientes ativos.
- Front `utils/apiClient.js`: le erro `{ msg }` do back.
