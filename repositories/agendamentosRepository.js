import Database from "../db/database.js";
import Agendamento from "../entities/Agendamento.js";
import AgendamentoParticipante from "../entities/AgendamentoParticipante.js";
import AgendamentoSlot from "../entities/AgendamentoSlot.js";
import Servico from "../entities/Servico.js";
import Usuario from "../entities/User.js";

export default class AgendamentosRepository {
  #banco;

  constructor() {
    this.#banco = new Database();
  }

  async listar() {
    const sql = `select * from agendamentos order by data desc, hora_inicio asc`;
    const rows = await this.#banco.ExecutaComando(sql, []);
    return rows.map(r => this.toMapAgendamento(r));
  }

  async obterPorId(id) {
    const sql = `select * from agendamentos where id=? limit 1`;
    const rows = await this.#banco.ExecutaComando(sql, [id]);
    return rows.length ? this.toMapAgendamento(rows[0]) : null;
  }

  async listarDoUsuario(userId) {
    const sql = `
      select a.*
      from agendamentos a
      join agendamento_participantes ap on ap.agendamento_id = a.id
      where ap.user_id = ?
      order by a.data desc, a.hora_inicio asc
    `;
    const rows = await this.#banco.ExecutaComando(sql, [userId]);
    return rows.map(r => this.toMapAgendamento(r));
  }

  // data: 'YYYY-MM-DD', horaInicio: 'HH:MM:SS'
  // participantes: [{userId, nomeNoMomento}]
  async criar(ag, participantes = []) {
    const tx = await this.#banco.getConnectionTx();
    try {
      // 1) checar bloqueio do slot alvo
      const bloq = await tx.query(`select 1 from bloqueios_slot where data=? and slot=? limit 1`, [ag.data, ag.horaInicio]);
      if (bloq.length) throw new Error("Slot bloqueado");

      // 2) reservar slots (1h individual, 2h turma) - aqui seguimos tua regra atual:
      const durH = ag.tipo === "turma" ? 2 : 1;
      const slots = this.#gerarSlots(ag.horaInicio, durH);

      // checa se já está reservado
      for (const s of slots) {
        const ocupado = await tx.query(
          `select 1 from agendamento_slots where data=? and slot=? and status='ativo' limit 1`,
          [ag.data, s]
        );
        if (ocupado.length) throw new Error("Slot nao disponivel");
        const bloq2 = await tx.query(`select 1 from bloqueios_slot where data=? and slot=? limit 1`, [ag.data, s]);
        if (bloq2.length) throw new Error("Slot bloqueado");
      }

      // 3) turma regras min/max
      if (ag.tipo === "turma" && participantes.length < 2) throw new Error("Turma precisa de minimo 2 participantes");
      if (ag.tipo === "turma" && participantes.length > 5) throw new Error("Turma aceita maximo 5 participantes");

      // 4) calcular horaFim
      ag.horaFim = this.#somarHoras(ag.horaInicio, durH);

      // 5) insert agendamento
      await tx.query(
        `insert into agendamentos (id, tipo, servico_id, data, hora_inicio, hora_fim, status, observacao, criado_por_user_id)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ag.id, ag.tipo, ag.servico.id, ag.data,
          ag.horaInicio, ag.horaFim,
          ag.status, ag.observacao, ag.criadoPor?.id || null
        ]
      );

      // 6) insert participantes
      for (const p of participantes) {
        await tx.query(
          `insert into agendamento_participantes (agendamento_id, user_id, nome_no_momento)
           values (?, ?, ?)`,
          [ag.id, p.userId, p.nomeNoMomento]
        );
      }

      // 7) insert slots reservados (PK data+slot garante)
      for (const s of slots) {
        await tx.query(
          `insert into agendamento_slots (data, slot, agendamento_id, status)
           values (?, ?, ?, 'ativo')`,
          [ag.data, s, ag.id]
        );
      }

      // 8) gerar financeiro por participante (1 por user/agendamento)
      // pega servico pra valor/descricao
      const servRows = await tx.query(`select * from servicos where id=? limit 1`, [ag.servico.id]);
      const serv = servRows.length ? servRows[0] : null;
      const preco = serv ? Number(serv.preco) : 0;
      const nomeServ = serv ? serv.nome : "Servico";

      for (const p of participantes) {
        await tx.query(
          `insert into financeiro_lancamentos
            (id, descricao, valor, forma_pagto, status, data_ref, user_id, venda_id, agendamento_id)
           values
            (?, ?, ?, NULL, 'pendente', ?, ?, NULL, ?)`,
          [
            this.#genId("f"),
            `${nomeServ} - ${p.nomeNoMomento}`,
            preco,
            ag.data,
            p.userId,
            ag.id
          ]
        );
      }

      await tx.commit();
      return true;
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  async cancelar(id) {
    const tx = await this.#banco.getConnectionTx();
    try {
      await tx.query(`update agendamentos set status='cancelado' where id=?`, [id]);
      await tx.query(`update agendamento_slots set status='cancelado' where agendamento_id=?`, [id]);
      await tx.query(`update financeiro_lancamentos set status='cancelado' where agendamento_id=? and status='pendente'`, [id]);
      await tx.commit();
      return true;
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  async remarcar(id, novaData, novaHoraInicio) {
    const tx = await this.#banco.getConnectionTx();
    try {
      const agRows = await tx.query(`select * from agendamentos where id=? limit 1`, [id]);
      if (!agRows.length) throw new Error("Agendamento nao encontrado");
      const ag = agRows[0];

      const durH = ag.tipo === "turma" ? 2 : 1;
      const slotsNovos = this.#gerarSlots(novaHoraInicio, durH);
      const horaFimNova = this.#somarHoras(novaHoraInicio, durH);

      // valida slots novos
      for (const s of slotsNovos) {
        const bloq = await tx.query(`select 1 from bloqueios_slot where data=? and slot=? limit 1`, [novaData, s]);
        if (bloq.length) throw new Error("Slot bloqueado");
        const ocupado = await tx.query(
          `select 1 from agendamento_slots where data=? and slot=? and status='ativo' and agendamento_id <> ? limit 1`,
          [novaData, s, id]
        );
        if (ocupado.length) throw new Error("Slot nao disponivel");
      }

      // cancela slots antigos e cria novos
      await tx.query(`delete from agendamento_slots where agendamento_id=?`, [id]);
      for (const s of slotsNovos) {
        await tx.query(
          `insert into agendamento_slots (data, slot, agendamento_id, status)
           values (?, ?, ?, 'ativo')`,
          [novaData, s, id]
        );
      }

      await tx.query(
        `update agendamentos
         set data=?, hora_inicio=?, hora_fim=?
         where id=?`,
        [novaData, novaHoraInicio, horaFimNova, id]
      );

      await tx.commit();
      return true;
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  // ─── helpers ───

  #gerarSlots(horaInicio, durH) {
    // horaInicio 'HH:MM:SS' ou 'HH:MM'
    const base = horaInicio.length === 5 ? `${horaInicio}:00` : horaInicio;
    const [h, m] = base.split(":").map(Number);
    const slots = [];
    for (let i = 0; i < durH; i++) {
      const hh = String(h + i).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      slots.push(`${hh}:${mm}:00`);
    }
    return slots;
  }

  #somarHoras(horaInicio, durH) {
    const base = horaInicio.length === 5 ? `${horaInicio}:00` : horaInicio;
    const [h, m] = base.split(":").map(Number);
    const hh = String(h + durH).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    return `${hh}:${mm}:00`;
  }

  // id simples (se você já tiver gerador, troca aqui)
  #genId(prefix) {
    return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }

  toMapAgendamento(row) {
    let a = new Agendamento();
    a.id = row["id"];
    a.tipo = row["tipo"];

    a.servico = new Servico();
    a.servico.id = row["servico_id"];

    a.data = row["data"];
    a.horaInicio = row["hora_inicio"];
    a.horaFim = row["hora_fim"];
    a.status = row["status"];
    a.observacao = row["observacao"];

    a.criadoPor = new Usuario();
    a.criadoPor.id = row["criado_por_user_id"];

    return a;
  }
}