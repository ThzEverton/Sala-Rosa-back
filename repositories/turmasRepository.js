import Database from "../db/database.js";
import Agendamento from "../entities/Agendamento.js";
import Servico from "../entities/Servico.js";
import Usuario from "../entities/User.js";

export default class TurmasRepository {
  #banco;

  constructor() {
    this.#banco = new Database();
  }

  async listarTurmasAbertas() {
    const sql = `
      select 
        a.*,
        s.nome as servico_nome,
        (
          select count(*)
          from agendamento_participantes ap
          where ap.agendamento_id = a.id
        ) as qtd_participantes
      from agendamentos a
      inner join servicos s on s.id = a.servico_id
      where a.tipo = 'turma'
        and a.status not in ('cancelado', 'concluido')
      order by a.data asc, a.hora_inicio asc
    `;

    const rows = await this.#banco.ExecutaComando(sql, []);
    return rows
      .filter(r => Number(r.qtd_participantes) < 5)
      .map(r => this.toMapAgendamento(r));
  }

  async listarTodasTurmas() {
    const sql = `
      select 
        a.*,
        s.nome as servico_nome,
        (
          select count(*)
          from agendamento_participantes ap
          where ap.agendamento_id = a.id
        ) as qtd_participantes
      from agendamentos a
      inner join servicos s on s.id = a.servico_id
      where a.tipo = 'turma'
      order by a.data desc, a.hora_inicio desc
    `;

    const rows = await this.#banco.ExecutaComando(sql, []);
    return rows.map(r => this.toMapAgendamento(r));
  }

  async obterTurmaPorId(id) {
    const sql = `
      select 
        a.*,
        s.nome as servico_nome,
        (
          select count(*)
          from agendamento_participantes ap
          where ap.agendamento_id = a.id
        ) as qtd_participantes
      from agendamentos a
      inner join servicos s on s.id = a.servico_id
      where a.id = ?
        and a.tipo = 'turma'
      limit 1
    `;

    const rows = await this.#banco.ExecutaComando(sql, [id]);

    if (rows.length === 0) {
      return null;
    }

    return this.toMapAgendamento(rows[0]);
  }

  async listarParticipantes(turmaId) {
    const sql = `
      select 
        ap.id,
        ap.agendamento_id,
        ap.user_id,
        ap.nome_no_momento,
        ap.created_at,
        u.email
      from agendamento_participantes ap
      inner join users u on u.id = ap.user_id
      where ap.agendamento_id = ?
      order by ap.created_at asc
    `;

    return await this.#banco.ExecutaComando(sql, [turmaId]);
  }

  async criarTurma(ent) {
    const sql = `
      insert into agendamentos
      (
        tipo,
        servico_id,
        data,
        hora_inicio,
        hora_fim,
        status,
        observacao,
        criado_por_user_id
      )
      values (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const vals = [
      "turma",
      ent.servico.id,
      ent.data,
      ent.horaInicio,
      ent.horaFim,
      ent.status || "confirmado",
      ent.observacao,
      ent.criadoPor?.id || null
    ];

    const result = await this.#banco.ExecutaComandoNonQuery(sql, vals);
    return result;
  }

  async entrarNaTurma(agendamentoId, userId, nomeUser) {
    const tx = await this.#banco.getConnectionTx();

    try {
      const [rows] = await tx.query(
        `select * from agendamentos where id = ? limit 1`,
        [agendamentoId]
      );

      if (!rows.length) {
        throw new Error("Turma não encontrada");
      }

      const ag = rows[0];

      if (ag.tipo !== "turma") {
        throw new Error("Este agendamento não é uma turma");
      }

      if (ag.status === "cancelado" || ag.status === "concluido") {
        throw new Error("Turma não está mais aberta");
      }

      const [cRows] = await tx.query(
        `select count(*) as qtd from agendamento_participantes where agendamento_id = ?`,
        [agendamentoId]
      );

      const qtd = Number(cRows[0].qtd);

      if (qtd >= 5) {
        throw new Error("Turma cheia (máximo 5 participantes)");
      }

      const [ja] = await tx.query(
        `select 1 from agendamento_participantes where agendamento_id = ? and user_id = ? limit 1`,
        [agendamentoId, userId]
      );

      if (ja.length) {
        throw new Error("Você já está nesta turma");
      }

      await tx.query(
        `insert into agendamento_participantes (agendamento_id, user_id, nome_no_momento)
         values (?, ?, ?)`,
        [agendamentoId, userId, nomeUser]
      );

      const [servRows] = await tx.query(
        `select * from servicos where id = ? limit 1`,
        [ag.servico_id]
      );

      const serv = servRows.length ? servRows[0] : null;
      const preco = serv ? Number(serv.preco) : 0;
      const nomeServ = serv ? serv.nome : "Serviço";

      await tx.query(
        `insert into financeiro_lancamentos
        (
          descricao,
          valor,
          forma_pagto,
          status,
          data_ref,
          user_id,
          venda_id,
          agendamento_id
        )
        values (?, ?, NULL, 'pendente', ?, ?, NULL, ?)`,
        [
          `${nomeServ} - ${nomeUser}`,
          preco,
          ag.data,
          userId,
          agendamentoId
        ]
      );

      await tx.commit();
      return true;
    } catch (e) {
      await tx.rollback();
      throw e;
    } finally {
      if (tx.release) tx.release();
    }
  }

  async sairDaTurma(agendamentoId, userId) {
    const tx = await this.#banco.getConnectionTx();

    try {
      const [ja] = await tx.query(
        `select 1 from agendamento_participantes where agendamento_id = ? and user_id = ? limit 1`,
        [agendamentoId, userId]
      );

      if (!ja.length) {
        throw new Error("Usuário não está nesta turma");
      }

      await tx.query(
        `delete from agendamento_participantes where agendamento_id = ? and user_id = ?`,
        [agendamentoId, userId]
      );

      await tx.query(
        `delete from financeiro_lancamentos where agendamento_id = ? and user_id = ?`,
        [agendamentoId, userId]
      );

      await tx.commit();
      return true;
    } catch (e) {
      await tx.rollback();
      throw e;
    } finally {
      if (tx.release) tx.release();
    }
  }

  async removerParticipante(turmaId, userId) {
    const tx = await this.#banco.getConnectionTx();

    try {
      const [ja] = await tx.query(
        `select 1 from agendamento_participantes where agendamento_id = ? and user_id = ? limit 1`,
        [turmaId, userId]
      );

      if (!ja.length) {
        throw new Error("Participante não encontrado nesta turma");
      }

      await tx.query(
        `delete from agendamento_participantes where agendamento_id = ? and user_id = ?`,
        [turmaId, userId]
      );

      await tx.query(
        `delete from financeiro_lancamentos where agendamento_id = ? and user_id = ?`,
        [turmaId, userId]
      );

      await tx.commit();
      return true;
    } catch (e) {
      await tx.rollback();
      throw e;
    } finally {
      if (tx.release) tx.release();
    }
  }

  toMapAgendamento(row) {
    let a = new Agendamento();
    a.id = row["id"];
    a.tipo = row["tipo"];

    a.servico = new Servico();
    a.servico.id = row["servico_id"];
    a.servico.nome = row["servico_nome"];

    a.data = row["data"];
    a.horaInicio = row["hora_inicio"];
    a.horaFim = row["hora_fim"];
    a.status = row["status"];
    a.observacao = row["observacao"];

    a.criadoPor = new Usuario();
    a.criadoPor.id = row["criado_por_user_id"];

    a.qtdParticipantes = Number(row["qtd_participantes"] || 0);

    return a;
  }
}