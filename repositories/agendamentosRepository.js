import Database from "../db/database.js";
import Agendamento from "../entities/Agendamento.js";
import Servico from "../entities/Servico.js";
import Usuario from "../entities/User.js";

export default class AgendamentosRepository {
  #banco;

  constructor() {
    this.#banco = new Database();
  }

  async listar(data = null) {
    let sql = `
      select
        a.id,
        a.tipo,
        a.servico_id,
        s.nome as servico_nome,
        a.data,
        a.hora_inicio,
        a.hora_fim,
        a.status,
        a.observacao,
        a.criado_por_user_id,
        u.nome as criado_por_nome
      from agendamentos a
      inner join servicos s on s.id = a.servico_id
      left join users u on u.id = a.criado_por_user_id
      where a.tipo = 'individual'
    `;

    const vals = [];

    if (data) {
      sql += ` and a.data = ? `;
      vals.push(data);
    }

    sql += ` order by a.data desc, a.hora_inicio asc `;

    const rows = await this.#banco.ExecutaComando(sql, vals);
    return rows.map(r => this.toMapAgendamento(r));
  }

  async obterPorId(id) {
    const sql = `
      select
        a.id,
        a.tipo,
        a.servico_id,
        s.nome as servico_nome,
        a.data,
        a.hora_inicio,
        a.hora_fim,
        a.status,
        a.observacao,
        a.criado_por_user_id,
        u.nome as criado_por_nome
      from agendamentos a
      inner join servicos s on s.id = a.servico_id
      left join users u on u.id = a.criado_por_user_id
      where a.id = ?
      limit 1
    `;

    const rows = await this.#banco.ExecutaComando(sql, [id]);
    if (!rows.length) return null;

    return this.toMapAgendamento(rows[0]);
  }

  async listarParticipantes(agendamentoId) {
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
    return await this.#banco.ExecutaComando(sql, [agendamentoId]);
  }

  async criar({ servicoId, data, horaInicio, observacao, userId, nomeUser }) {
    const tx = await this.#banco.getConnectionTx();

    try {
      const [servRows] = await tx.query(
        `select * from servicos where id = ? and ativo = 1 limit 1`,
        [servicoId]
      );

      if (!servRows.length) {
        throw new Error("Serviço não encontrado");
      }

      const servico = servRows[0];
      const duracaoMin = Number(servico.duracao_min);
      const horaFim = this.#somarMinutos(horaInicio, duracaoMin);

      const [bloqRows] = await tx.query(
        `
          select 1
          from bloqueios_slot
          where data = ?
            and slot >= ?
            and slot < ?
          limit 1
        `,
        [data, horaInicio, horaFim]
      );

      if (bloqRows.length) {
        throw new Error("Existe bloqueio nesse horário");
      }

      const [ocupRows] = await tx.query(
        `
          select 1
          from agendamento_slots
          where data = ?
            and status = 'ativo'
            and slot >= ?
            and slot < ?
          limit 1
        `,
        [data, horaInicio, horaFim]
      );

      if (ocupRows.length) {
        throw new Error("Já existe agendamento nesse horário");
      }

      const [cfgRows] = await tx.query(
        `select * from horario_config where id = 1 limit 1`
      );

      if (!cfgRows.length) {
        throw new Error("Configuração da agenda não encontrada");
      }

      const cfg = cfgRows[0];
      const inicioPadrao = String(cfg.hora_inicio_padrao).slice(0, 8);
      const fimPadrao = String(cfg.hora_fim_padrao).slice(0, 8);

      if (horaInicio < inicioPadrao || horaFim > fimPadrao) {
        throw new Error("Horário fora da agenda padrão");
      }

      const [excRows] = await tx.query(
        `select * from excecoes_dia where data = ? limit 1`,
        [data]
      );

      if (excRows.length) {
        const exc = excRows[0];

        if (exc.hora_inicio_excecao && exc.hora_fim_excecao) {
          const inicioExc = String(exc.hora_inicio_excecao).slice(0, 8);
          const fimExc = String(exc.hora_fim_excecao).slice(0, 8);

          if (horaInicio < inicioExc || horaFim > fimExc) {
            throw new Error("Horário fora da exceção configurada para este dia");
          }
        }
      }

      const [agResult] = await tx.query(
        `
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
        `,
        [
          "individual",
          servicoId,
          data,
          horaInicio,
          horaFim,
          "confirmado",
          observacao || null,
          userId
        ]
      );

      const agendamentoId = agResult.insertId;

      await tx.query(
        `
          insert into agendamento_participantes
          (agendamento_id, user_id, nome_no_momento)
          values (?, ?, ?)
        `,
        [agendamentoId, userId, nomeUser]
      );

      const slots = this.#gerarSlots(horaInicio, horaFim, Number(cfg.duracao_slot_minutos));

      for (const slot of slots) {
        await tx.query(
          `
            insert into agendamento_slots
            (data, slot, agendamento_id, status)
            values (?, ?, ?, 'ativo')
          `,
          [data, slot, agendamentoId]
        );
      }

      await tx.commit();
      return agendamentoId;
    } catch (e) {
      await tx.rollback();
      throw e;
    } finally {
      if (tx.release) tx.release();
    }
  }

  async cancelar(id) {
    const tx = await this.#banco.getConnectionTx();

    try {
      const [rows] = await tx.query(
        `select * from agendamentos where id = ? limit 1`,
        [id]
      );

      if (!rows.length) {
        throw new Error("Agendamento não encontrado");
      }

      const ag = rows[0];

      if (ag.status === "cancelado") {
        throw new Error("Agendamento já está cancelado");
      }

      await tx.query(
        `update agendamentos set status = 'cancelado' where id = ?`,
        [id]
      );

      await tx.query(
        `update agendamento_slots set status = 'cancelado' where agendamento_id = ?`,
        [id]
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

  #somarMinutos(hora, minutos) {
    const base = new Date(`1970-01-01T${String(hora).slice(0, 8)}`);
    base.setMinutes(base.getMinutes() + Number(minutos));
    return base.toTimeString().slice(0, 8);
  }

  #gerarSlots(horaInicio, horaFim, duracaoSlot) {
    const lista = [];
    let atual = new Date(`1970-01-01T${String(horaInicio).slice(0, 8)}`);
    const fim = new Date(`1970-01-01T${String(horaFim).slice(0, 8)}`);

    while (atual < fim) {
      lista.push(atual.toTimeString().slice(0, 8));
      atual.setMinutes(atual.getMinutes() + Number(duracaoSlot));
    }

    return lista;
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
    a.criadoPor.nome = row["criado_por_nome"];

    return a;
  }
}