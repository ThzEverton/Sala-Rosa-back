import Database from "../db/database.js";
import Agendamento from "../entities/Agendamento.js";
import Servico from "../entities/Servico.js";
import Usuario from "../entities/User.js";

export default class TurmasRepository {
  #banco;

  constructor() {
    this.#banco = new Database();
  }

  // ── LISTAGEM ──────────────────────────────────────────────────────────────

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
        and a.status = 'aprovado'
      order by a.data asc, a.hora_inicio asc
    `;

    const rows = await this.#banco.ExecutaComando(sql, []);
    return rows
      .filter(r => Number(r.qtd_participantes) < Number(r.capacidade_maxima ?? 5))
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
    if (!rows.length) return null;
    return this.toMapAgendamento(rows[0]);
  }

  async obterTurmaPorCodigo(codigo) {
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
      where a.codigo_convite = ?
        and a.tipo = 'turma'
      limit 1
    `;

    const rows = await this.#banco.ExecutaComando(sql, [codigo]);
    if (!rows.length) return null;
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

  // ── CRIAR ─────────────────────────────────────────────────────────────────

  async criarTurma(ent) {
    const gerarCodigo = () =>
      Math.random().toString(36).substring(2, 10).toUpperCase();

    let codigo = null;
    let tentativas = 0;

    while (!codigo && tentativas < 10) {
      const candidato = gerarCodigo();
      const existente = await this.#banco.ExecutaComando(
        `select 1 from agendamentos where codigo_convite = ? limit 1`,
        [candidato]
      );
      if (!existente.length) codigo = candidato;
      tentativas++;
    }

    if (!codigo) throw new Error("Não foi possível gerar um código único para a turma");

    const sql = `
      insert into agendamentos
      (tipo, servico_id, data, hora_inicio, hora_fim, status, observacao, criado_por_user_id, capacidade_maxima, codigo_convite)
      values (?, ?, ?, ?, ?, 'pendente_aprovacao', ?, ?, ?, ?)
    `;

    const vals = [
      "turma",
      ent.servico.id,
      ent.data,
      ent.horaInicio,
      ent.horaFim,
      ent.observacao ?? null,
      ent.criadoPor?.id ?? null,
      ent.capacidadeMaxima ?? 5,
      codigo
    ];

    const result = await this.#banco.ExecutaComandoNonQuery(sql, vals);
    return { insertId: result.insertId ?? result, codigoConvite: codigo };
  }

  // ── APROVAÇÃO ─────────────────────────────────────────────────────────────

  async aprovarTurma(turmaId) {
    const tx = await this.#banco.getConnectionTx();
    try {
      const [rows] = await tx.query(
        `select * from agendamentos where id = ? and tipo = 'turma' limit 1`,
        [turmaId]
      );

      if (!rows.length) throw new Error("Turma não encontrada");

      if (rows[0].status !== "pendente_aprovacao") {
        throw new Error(`Turma não pode ser aprovada — status atual: ${rows[0].status}`);
      }

      await tx.query(
        `update agendamentos set status = 'aprovado' where id = ?`,
        [turmaId]
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

  async recusarTurma(turmaId, motivo = null) {
    const tx = await this.#banco.getConnectionTx();
    try {
      const [rows] = await tx.query(
        `select * from agendamentos where id = ? and tipo = 'turma' limit 1`,
        [turmaId]
      );

      if (!rows.length) throw new Error("Turma não encontrada");

      if (rows[0].status !== "pendente_aprovacao") {
        throw new Error(`Turma não pode ser recusada — status atual: ${rows[0].status}`);
      }

      const novaObs = motivo ? `[Recusado] ${motivo}` : rows[0].observacao;

      await tx.query(
        `update agendamentos set status = 'recusado', observacao = ? where id = ?`,
        [novaObs, turmaId]
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

  async atualizarDataHora(turmaId, { data, horaInicio, horaFim, capacidadeMaxima }) {
    const tx = await this.#banco.getConnectionTx();
    try {
      const [rows] = await tx.query(
        `select * from agendamentos where id = ? and tipo = 'turma' limit 1`,
        [turmaId]
      );

      if (!rows.length) throw new Error("Turma não encontrada");

      const statusBloqueado = ["cancelado", "concluido", "recusado"];
      if (statusBloqueado.includes(rows[0].status)) {
        throw new Error(`Não é possível editar turma com status: ${rows[0].status}`);
      }

      const campos = [];
      const vals   = [];

      if (data)             { campos.push("data = ?");              vals.push(data); }
      if (horaInicio)       { campos.push("hora_inicio = ?");       vals.push(horaInicio); }
      if (horaFim)          { campos.push("hora_fim = ?");          vals.push(horaFim); }
      if (capacidadeMaxima) { campos.push("capacidade_maxima = ?"); vals.push(Number(capacidadeMaxima)); }

      if (!campos.length) throw new Error("Nenhum campo enviado para atualizar");

      vals.push(turmaId);

      await tx.query(
        `update agendamentos set ${campos.join(", ")} where id = ?`,
        vals
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

  // ── PARTICIPANTES ─────────────────────────────────────────────────────────

  async entrarNaTurma(agendamentoId, userId, nomeUser) {
    const tx = await this.#banco.getConnectionTx();
    try {
      const [rows] = await tx.query(
        `select * from agendamentos where id = ? limit 1`,
        [agendamentoId]
      );

      if (!rows.length) throw new Error("Turma não encontrada");

      const ag = rows[0];

      if (ag.tipo !== "turma") throw new Error("Este agendamento não é uma turma");

      if (ag.status !== "aprovado") {
        throw new Error("Esta turma ainda não está disponível para inscrições");
      }

      const [cRows] = await tx.query(
        `select count(*) as qtd from agendamento_participantes where agendamento_id = ?`,
        [agendamentoId]
      );

      const capacidade = Number(ag.capacidade_maxima ?? 5);
      if (Number(cRows[0].qtd) >= capacidade) {
        throw new Error(`Turma cheia (máximo ${capacidade} participantes)`);
      }

      const [ja] = await tx.query(
        `select 1 from agendamento_participantes where agendamento_id = ? and user_id = ? limit 1`,
        [agendamentoId, userId]
      );

      if (ja.length) throw new Error("Você já está nesta turma");

      await tx.query(
        `insert into agendamento_participantes (agendamento_id, user_id, nome_no_momento)
         values (?, ?, ?)`,
        [agendamentoId, userId, nomeUser]
      );

      const [servRows] = await tx.query(
        `select * from servicos where id = ? limit 1`,
        [ag.servico_id]
      );

      const serv     = servRows[0] ?? null;
      const preco    = serv ? Number(serv.preco) : 0;
      const nomeServ = serv ? serv.nome : "Serviço";

      await tx.query(
        `insert into financeiro_lancamentos
         (descricao, valor, forma_pagto, status, data_ref, user_id, venda_id, agendamento_id)
         values (?, ?, NULL, 'pendente', ?, ?, NULL, ?)`,
        [`${nomeServ} - ${nomeUser}`, preco, ag.data, userId, agendamentoId]
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

  async entrarNaTurmaPorCodigo(codigo, userId, nomeUser) {
    const tx = await this.#banco.getConnectionTx();
    try {
      const [rows] = await tx.query(
        `select * from agendamentos where codigo_convite = ? and tipo = 'turma' limit 1`,
        [codigo]
      );

      if (!rows.length) throw new Error("Código de convite inválido");

      const ag = rows[0];

      if (ag.status !== "aprovado") {
        throw new Error("Esta turma não está disponível para inscrições");
      }

      const [cRows] = await tx.query(
        `select count(*) as qtd from agendamento_participantes where agendamento_id = ?`,
        [ag.id]
      );

      const capacidade = Number(ag.capacidade_maxima ?? 5);
      if (Number(cRows[0].qtd) >= capacidade) {
        throw new Error(`Turma cheia (máximo ${capacidade} participantes)`);
      }

      const [ja] = await tx.query(
        `select 1 from agendamento_participantes where agendamento_id = ? and user_id = ? limit 1`,
        [ag.id, userId]
      );

      if (ja.length) throw new Error("Você já está nesta turma");

      await tx.query(
        `insert into agendamento_participantes (agendamento_id, user_id, nome_no_momento)
         values (?, ?, ?)`,
        [ag.id, userId, nomeUser]
      );

      const [servRows] = await tx.query(
        `select * from servicos where id = ? limit 1`,
        [ag.servico_id]
      );

      const serv     = servRows[0] ?? null;
      const preco    = serv ? Number(serv.preco) : 0;
      const nomeServ = serv ? serv.nome : "Serviço";

      await tx.query(
        `insert into financeiro_lancamentos
         (descricao, valor, forma_pagto, status, data_ref, user_id, venda_id, agendamento_id)
         values (?, ?, NULL, 'pendente', ?, ?, NULL, ?)`,
        [`${nomeServ} - ${nomeUser}`, preco, ag.data, userId, ag.id]
      );

      await tx.commit();
      return { turmaId: ag.id };
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

      if (!ja.length) throw new Error("Usuário não está nesta turma");

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

      if (!ja.length) throw new Error("Participante não encontrado nesta turma");

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

  // ── MAPPER ────────────────────────────────────────────────────────────────

  toMapAgendamento(row) {
    let a = new Agendamento();
    a.id   = row["id"];
    a.tipo = row["tipo"];

    a.servico      = new Servico();
    a.servico.id   = row["servico_id"];
    a.servico.nome = row["servico_nome"];

    a.data             = row["data"];
    a.horaInicio       = row["hora_inicio"];
    a.horaFim          = row["hora_fim"];
    a.status           = row["status"];
    a.observacao       = row["observacao"];
    a.capacidadeMaxima = Number(row["capacidade_maxima"] ?? 5);
    a.codigoConvite    = row["codigo_convite"] ?? null;

    a.criadoPor    = new Usuario();
    a.criadoPor.id = row["criado_por_user_id"];

    a.qtdParticipantes = Number(row["qtd_participantes"] ?? 0);

    return a;
  }
}