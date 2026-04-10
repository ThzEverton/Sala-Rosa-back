# Sala Rosa – Backend

API para gerenciamento de agendamentos, agenda, vendas e financeiro.

Foco em regra de negócio (agenda por horário) e organização em camadas.

---

## Stack

- Node.js
- Express
- MySQL
- JWT
- Swagger

---


## Padrão

- Controller → entrada da requisição  
- Repository → acesso ao banco  
- Entity → estrutura de dados  
- Middleware → validações  

---

## Regras de Negócio

### Agendamento

- Tipos:
  - `individual` → confirmado direto
  - `turma` → depende de aprovação

- Usa controle por **slots de tempo**
- Não permite conflito de horário
- Valida:
  - horários configurados
  - exceções
  - bloqueios

### Duração

- Individual → 1h  
- Turma → 2h  

### Slots

- Baseados na configuração da agenda
- Status:
  - disponível
  - ocupado
  - bloqueado

### Cancelamento

- Atualiza status
- Libera os slots

---

## Autenticação

- JWT
- Header: `Authorization: Bearer`
- ou cookie


---

## Execução

```bash
npm install
npm run dev
