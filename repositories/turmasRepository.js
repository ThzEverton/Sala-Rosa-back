import Database from "../db/database.js";
import Agendamento from "../entities/Agendamento.js";
import Servico from "../entities/Servico.js";
import Usuario from "../entities/User.js";

export default class TurmasRepository {
  #banco;

  constructor() {
    this.#banco = new Database();
  }

  #normalizeRows(result) {
    if (Array.isArray(result?.[0])) return result[0];
    if (Array.isArray(result)) return result;
    return [];
  }

  #toMin(hora) {
    if (!hora) return 0;
    const [h, m] = String(hora).slice(0, 5).split(":").map(Number);
    return h * 60 + m;
  }

  #gerarSlots(horaInicio, horaFim, duracaoMinutos) {
    const slots = [];
    let atual = new Date(`1970-01-01T${String(horaInicio).slice(0, 8)}`);
    const fim = new Date(`1970-01-01T${String(horaFim).slice(0, 8)}`);

    while (atual < fim) {
      slots.push(atual.toTimeString().slice(0, 8));
      atual.setMinutes(atual.getMinutes() + Number(duracaoMinutos));
    }

    return slots;
  }

  // ── Listagens ────────────────────────────────────────────────────────────────

  
  async listarTurmasAbertas(userId = null) {
    const sql = `
      select
        a.*,
        s.nome as servico_nome,
        (
          select count(*)
          from agendamento_participantes ap
          where ap.agendamento_id = a.id
        ) as qtd_participantes,
        ${
          userId
            ? `(
          select count(*)
          from agendamento_participantes ap2
          where ap2.agendamento_id = a.id
            and ap2.user_id = ?
        ) as participando`
            : "0 as participando"
        }
      from agendamentos a
      inner join servicos s on s.id = a.servico_id
      where a.tipo = 'turma'
        and a.status = 'aprovado'
      order by a.data asc, a.hora_inicio asc
    `;

    const params = userId ? [userId] : [];
    const rows = await this.#banco.ExecutaComando(sql, params);

    return rows
      .filter((r) => Number(r.qtd_participantes) < Number(r.capacidade_maxima ?? 5))
      .map((r) => this.toMapAgendamento(r));
  }
async listarTurmasDoUsuario(userId) {
  const sql = `
    select
      a.*,
      s.nome as servico_nome,
      (
        select count(*)
        from agendamento_participantes ap
        where ap.agendamento_id = a.id
      ) as qtd_participantes,
      1 as participando
    from agendamentos a
    inner join servicos s on s.id = a.servico_id
    inner join agendamento_participantes ap_me
      on ap_me.agendamento_id = a.id
      and ap_me.user_id = ?
    where a.tipo = 'turma'
      and a.status = 'aprovado'
    order by a.data asc, a.hora_inicio asc
  `;

  const rows = await this.#banco.ExecutaComando(sql, [userId]);
  return rows.map((r) => this.toMapAgendamento(r));
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
    return rows.map((r) => this.toMapAgendamento(r));
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

  // ── Criar ────────────────────────────────────────────────────────────────────

  async criarTurma(ent) {
    const tx = await this.#banco.getConnectionTx();
    const gerarCodigo = () =>
      Math.random().toString(36).substring(2, 10).toUpperCase();

    try {
      const resultServico = await tx.query(
        `select id from servicos where id = ? and ativo = 1 limit 1`,
        [ent.servico.id]
      );
      const servRows = this.#normalizeRows(resultServico);

      if (!servRows.length) throw new Error("Serviço não encontrado");

      const resultCfg = await tx.query(
        `select * from horario_config where id = 1 limit 1`
      );
      const cfgRows = this.#normalizeRows(resultCfg);

      if (!cfgRows.length) throw new Error("Configuração da agenda não encontrada");

      const cfg = cfgRows[0];
      const data = String(ent.data).slice(0, 10);
      const horaInicio = String(ent.horaInicio).slice(0, 8);
      const horaFim = String(ent.horaFim).slice(0, 8);

      const [ano, mes, dia] = data.split("-").map(Number);
      const dow = new Date(ano, mes - 1, dia).getDay();
      const fimSemana = dow === 0 || dow === 6;

      const inicioPadrao = fimSemana
        ? String(cfg.hora_inicio_fim_semana || "").slice(0, 8)
        : String(cfg.hora_inicio_semana || "").slice(0, 8);

      const fimPadrao = fimSemana
        ? String(cfg.hora_fim_fim_semana || "").slice(0, 8)
        : String(cfg.hora_fim_semana || "").slice(0, 8);

      if (!inicioPadrao || !fimPadrao) {
        throw new Error("Agenda não configurada para este dia");
      }

      if (
        this.#toMin(horaInicio) < this.#toMin(inicioPadrao) ||
        this.#toMin(horaFim) > this.#toMin(fimPadrao)
      ) {
        throw new Error("Horário fora da agenda padrão");
      }

      const resultExc = await tx.query(
        `select id, data, hora_inicio_excecao, hora_fim_excecao, recorrente, dias_semana
         from excecoes_dia
         where (recorrente = 0 and data = ?)
            or (recorrente = 1)`,
        [data]
      );
      const excRows = this.#normalizeRows(resultExc);

      for (const exc of excRows) {
        let aplicaNoDia = false;

        if (Number(exc.recorrente) === 1) {
          const diasSemana = exc.dias_semana
            ? String(exc.dias_semana).split(",").map(Number)
            : [];
          aplicaNoDia = diasSemana.includes(dow);
        } else {
          aplicaNoDia = String(exc.data).slice(0, 10) === data;
        }

        if (!aplicaNoDia) continue;
        if (!exc.hora_inicio_excecao || !exc.hora_fim_excecao) continue;

        const inicioExc = String(exc.hora_inicio_excecao).slice(0, 8);
        const fimExc = String(exc.hora_fim_excecao).slice(0, 8);

        const temSobreposicao =
          this.#toMin(horaInicio) < this.#toMin(fimExc) &&
          this.#toMin(horaFim) > this.#toMin(inicioExc);

        if (temSobreposicao) throw new Error("Horário indisponível por exceção da agenda");
      }

      const slots = this.#gerarSlots(horaInicio, horaFim, Number(cfg.duracao_slot_minutos));

      const resultBloq = await tx.query(
        `select slot from bloqueios_slot
         where data = ?
           and slot in (${slots.map(() => "?").join(",")})`,
        [data, ...slots]
      );
      const bloqRows = this.#normalizeRows(resultBloq);

      if (bloqRows.length) throw new Error("Existe bloqueio nesse horário");

      const resultOcup = await tx.query(
        `select slot from agendamento_slots
         where data = ?
           and status = 'ativo'
           and slot in (${slots.map(() => "?").join(",")})
         limit 1`,
        [data, ...slots]
      );
      const ocupRows = this.#normalizeRows(resultOcup);

      if (ocupRows.length) throw new Error("Já existe agendamento nesse horário");

      // Gera código único
      let codigo = null;
      let tentativas = 0;

      while (!codigo && tentativas < 10) {
        const candidato = gerarCodigo();
        const resultExistente = await tx.query(
          `select 1 from agendamentos where codigo_convite = ? limit 1`,
          [candidato]
        );
        const existente = this.#normalizeRows(resultExistente);
        if (!existente.length) codigo = candidato;
        tentativas++;
      }

      if (!codigo) throw new Error("Não foi possível gerar um código único para a turma");

      const resultInsert = await tx.query(
        `insert into agendamentos
          (tipo, servico_id, data, hora_inicio, hora_fim, status, observacao, criado_por_user_id, capacidade_maxima, codigo_convite)
         values (?, ?, ?, ?, ?, 'pendente_aprovacao', ?, ?, ?, ?)`,
        [
          "turma",
          ent.servico.id,
          data,
          horaInicio,
          horaFim,
          ent.observacao ?? null,
          ent.criadoPor?.id ?? null,
          ent.capacidadeMaxima ?? 5,
          codigo,
        ]
      );

      const insertResult = Array.isArray(resultInsert) ? resultInsert[0] : resultInsert;

      await tx.commit();

      return {
        insertId: insertResult?.insertId ?? null,
        codigoConvite: codigo,
      };
    } catch (e) {
      await tx.rollback();
      throw e;
    } finally {
      if (tx.release) tx.release();
    }
  }

  // ── Aprovar ──────────────────────────────────────────────────────────────────

  async aprovarTurma(turmaId) {
    const tx = await this.#banco.getConnectionTx();

    try {
      const resultRows = await tx.query(
        `select * from agendamentos where id = ? and tipo = 'turma' limit 1`,
        [turmaId]
      );
      const rows = this.#normalizeRows(resultRows);

      if (!rows.length) throw new Error("Turma não encontrada");

      const turma = rows[0];
      const statusPermitidos = ["pendente_aprovacao", "pendente"];

      if (!statusPermitidos.includes(turma.status)) {
        throw new Error(`Turma não pode ser aprovada — status atual: ${turma.status}`);
      }

      const resultCfg = await tx.query(
        `select duracao_slot_minutos from horario_config where id = 1 limit 1`
      );
      const cfgRows = this.#normalizeRows(resultCfg);

      if (!cfgRows.length) throw new Error("Configuração da agenda não encontrada");

      const duracaoSlot = Number(cfgRows[0].duracao_slot_minutos);

      const slots = this.#gerarSlots(
        String(turma.hora_inicio).slice(0, 8),
        String(turma.hora_fim).slice(0, 8),
        duracaoSlot
      );

      const resultBloq = await tx.query(
        `select slot from bloqueios_slot
         where data = ?
           and slot in (${slots.map(() => "?").join(",")})`,
        [turma.data, ...slots]
      );
      const bloqRows = this.#normalizeRows(resultBloq);

      if (bloqRows.length) throw new Error("Existe bloqueio nesse horário");

      const resultOcup = await tx.query(
        `select slot from agendamento_slots
         where data = ?
           and status = 'ativo'
           and slot in (${slots.map(() => "?").join(",")})
         limit 1`,
        [turma.data, ...slots]
      );
      const ocupRows = this.#normalizeRows(resultOcup);

      if (ocupRows.length) throw new Error("Já existe agendamento nesse horário");

      for (const slot of slots) {
        await tx.query(
          `insert into agendamento_slots (data, slot, agendamento_id, status)
           values (?, ?, ?, 'ativo')`,
          [turma.data, slot, turmaId]
        );
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

  // ── Recusar ──────────────────────────────────────────────────────────────────

  async recusarTurma(turmaId, motivo = null) {
    const tx = await this.#banco.getConnectionTx();

    try {
      const resultRows = await tx.query(
        `select * from agendamentos where id = ? and tipo = 'turma' limit 1`,
        [turmaId]
      );
      const rows = this.#normalizeRows(resultRows);

      if (!rows.length) throw new Error("Turma não encontrada");

      if (rows[0].status !== "pendente_aprovacao") {
        throw new Error(`Turma não pode ser recusada — status atual: ${rows[0].status}`);
      }

      const novaObs = motivo ? `[Recusado] ${motivo}` : (rows[0].observacao ?? null);

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

  // ── Editar ───────────────────────────────────────────────────────────────────

  async atualizarDataHora(turmaId, { data, horaInicio, horaFim, capacidadeMaxima }) {
    const tx = await this.#banco.getConnectionTx();
    try {
      const resultRows = await tx.query(
        `select * from agendamentos where id = ? and tipo = 'turma' limit 1`,
        [turmaId]
      );
      const rows = this.#normalizeRows(resultRows);

      if (!rows.length) throw new Error("Turma não encontrada");

      const statusBloqueado = ["cancelado", "concluido", "recusado"];
      if (statusBloqueado.includes(rows[0].status)) {
        throw new Error(`Não é possível editar turma com status: ${rows[0].status}`);
      }

      const campos = [];
      const vals = [];

      if (data) { campos.push("data = ?"); vals.push(data); }
      if (horaInicio) { campos.push("hora_inicio = ?"); vals.push(horaInicio); }
      if (horaFim) { campos.push("hora_fim = ?"); vals.push(horaFim); }
      if (capacidadeMaxima) {
        campos.push("capacidade_maxima = ?");
        vals.push(Number(capacidadeMaxima));
      }

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

  // ── Participantes ────────────────────────────────────────────────────────────

  async entrarNaTurma(agendamentoId, userId, nomeUser) {
    const tx = await this.#banco.getConnectionTx();

    try {
      const resultRows = await tx.query(
        `select * from agendamentos where id = ? limit 1`,
        [agendamentoId]
      );
      const rows = this.#normalizeRows(resultRows);

      if (!rows.length) throw new Error("Turma não encontrada");

      const ag = rows[0];

      if (ag.tipo !== "turma") throw new Error("Este agendamento não é uma turma");

      if (ag.status !== "aprovado") {
        throw new Error("Esta turma ainda não está disponível para inscrições");
      }

      const resultCount = await tx.query(
        `select count(*) as qtd from agendamento_participantes where agendamento_id = ?`,
        [agendamentoId]
      );
      const countRows = this.#normalizeRows(resultCount);
      const capacidade = Number(ag.capacidade_maxima ?? 5);

      if (Number(countRows[0].qtd) >= capacidade) {
        throw new Error(`Turma cheia (máximo ${capacidade} participantes)`);
      }

      const resultJa = await tx.query(
        `select 1 from agendamento_participantes
         where agendamento_id = ? and user_id = ? limit 1`,
        [agendamentoId, userId]
      );
      const jaRows = this.#normalizeRows(resultJa);

      if (jaRows.length) throw new Error("Você já está nesta turma");

      await tx.query(
        `insert into agendamento_participantes (agendamento_id, user_id, nome_no_momento)
         values (?, ?, ?)`,
        [agendamentoId, userId, nomeUser]
      );

      const resultServ = await tx.query(
        `select * from servicos where id = ? limit 1`,
        [ag.servico_id]
      );
      const servRows = this.#normalizeRows(resultServ);
      const serv = servRows[0] ?? null;
      const preco = serv ? Number(serv.preco) : 0;
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
      const resultRows = await tx.query(
        `select * from agendamentos
         where codigo_convite = ? and tipo = 'turma' limit 1`,
        [codigo]
      );
      const rows = this.#normalizeRows(resultRows);

      if (!rows.length) throw new Error("Código de convite inválido");

      const ag = rows[0];

      if (ag.status !== "aprovado") {
        throw new Error("Esta turma não está disponível para inscrições");
      }

      const resultCount = await tx.query(
        `select count(*) as qtd from agendamento_participantes where agendamento_id = ?`,
        [ag.id]
      );
      const countRows = this.#normalizeRows(resultCount);
      const capacidade = Number(ag.capacidade_maxima ?? 5);

      if (Number(countRows[0].qtd) >= capacidade) {
        throw new Error(`Turma cheia (máximo ${capacidade} participantes)`);
      }

      const resultJa = await tx.query(
        `select 1 from agendamento_participantes
         where agendamento_id = ? and user_id = ? limit 1`,
        [ag.id, userId]
      );
      const jaRows = this.#normalizeRows(resultJa);

      if (jaRows.length) throw new Error("Você já está nesta turma");

      await tx.query(
        `insert into agendamento_participantes (agendamento_id, user_id, nome_no_momento)
         values (?, ?, ?)`,
        [ag.id, userId, nomeUser]
      );

      const resultServ = await tx.query(
        `select * from servicos where id = ? limit 1`,
        [ag.servico_id]
      );
      const servRows = this.#normalizeRows(resultServ);
      const serv = servRows[0] ?? null;
      const preco = serv ? Number(serv.preco) : 0;
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
      const resultJa = await tx.query(
        `select 1 from agendamento_participantes
         where agendamento_id = ? and user_id = ? limit 1`,
        [agendamentoId, userId]
      );
      const jaRows = this.#normalizeRows(resultJa);

      if (!jaRows.length) throw new Error("Usuário não está nesta turma");

      await tx.query(
        `delete from agendamento_participantes
         where agendamento_id = ? and user_id = ?`,
        [agendamentoId, userId]
      );

      await tx.query(
        `delete from financeiro_lancamentos
         where agendamento_id = ? and user_id = ?`,
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
      const resultJa = await tx.query(
        `select 1 from agendamento_participantes
         where agendamento_id = ? and user_id = ? limit 1`,
        [turmaId, userId]
      );
      const jaRows = this.#normalizeRows(resultJa);

      if (!jaRows.length) throw new Error("Participante não encontrado nesta turma");

      await tx.query(
        `delete from agendamento_participantes
         where agendamento_id = ? and user_id = ?`,
        [turmaId, userId]
      );

      await tx.query(
        `delete from financeiro_lancamentos
         where agendamento_id = ? and user_id = ?`,
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

  // ── Mapper ───────────────────────────────────────────────────────────────────

  toMapAgendamento(row) {
  const a = new Agendamento();
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
  a.capacidadeMaxima = Number(row["capacidade_maxima"] ?? 5);
  a.capacidadeMinima = 2;
  a.codigoConvite = row["codigo_convite"] ?? null;

  a.criadoPor = new Usuario();
  a.criadoPor.id = row["criado_por_user_id"];

  a.quantidadeParticipantes = Number(row["qtd_participantes"] ?? 0);
  a.participando = Number(row["participando"] ?? 0) > 0;

  return a;
}
}