import Database from "../db/database.js";
import Agendamento from "../entities/Agendamento.js";
import Servico from "../entities/Servico.js";
import Usuario from "../entities/User.js";

export default class TurmasRepository {
  #banco;

  constructor() {
    this.#banco = new Database();
  }

  // igual fake: turmas abertas = tipo turma, status != cancelado/concluido, participantes < 5
  async listarTurmasAbertas() {
    const sql = `
      select a.*,
             (select count(*) from agendamento_participantes ap where ap.agendamento_id = a.id) as qtd
      from agendamentos a
      where a.tipo='turma'
        and a.status not in ('cancelado','concluido')
      having qtd < 5
      order by a.data asc, a.hora_inicio asc
    `;
    const rows = await this.#banco.ExecutaComando(sql, []);
    return rows.map(r => this.toMapAgendamento(r));
  }

  async entrarNaTurma(agendamentoId, userId, nomeUser) {
    const tx = await this.#banco.getConnectionTx();
    try {
      // carrega turma
      const rows = await tx.query(`select * from agendamentos where id=? limit 1`, [agendamentoId]);
      if (!rows.length) throw new Error("Turma nao encontrada");
      const ag = rows[0];

      if (ag.tipo !== "turma") throw new Error("Este agendamento nao e uma turma");
      if (ag.status === "cancelado" || ag.status === "concluido") throw new Error("Turma nao esta mais aberta");

      // lotacao (count)
      const cRows = await tx.query(
        `select count(*) as qtd from agendamento_participantes where agendamento_id=?`,
        [agendamentoId]
      );
      const qtd = Number(cRows[0].qtd);
      if (qtd >= 5) throw new Error("Turma cheia (maximo 5 participantes)");

      // ja existe?
      const ja = await tx.query(
        `select 1 from agendamento_participantes where agendamento_id=? and user_id=? limit 1`,
        [agendamentoId, userId]
      );
      if (ja.length) throw new Error("Voce ja esta nesta turma");

      // inserir participante
      await tx.query(
        `insert into agendamento_participantes (agendamento_id, user_id, nome_no_momento)
         values (?, ?, ?)`,
        [agendamentoId, userId, nomeUser]
      );

      // financeiro por participante
      const servRows = await tx.query(`select * from servicos where id=? limit 1`, [ag.servico_id]);
      const serv = servRows.length ? servRows[0] : null;
      const preco = serv ? Number(serv.preco) : 0;
      const nomeServ = serv ? serv.nome : "Servico";

      await tx.query(
        `insert into financeiro_lancamentos
          (id, descricao, valor, forma_pagto, status, data_ref, user_id, venda_id, agendamento_id)
         values
          (?, ?, ?, NULL, 'pendente', ?, ?, NULL, ?)`,
        [
          this.#genId("f"),
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
    }
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

  #genId(prefix) {
    return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
}