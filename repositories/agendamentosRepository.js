import Database from "../db/database.js";
import Agendamento from "../entities/Agendamento.js";
import Servico from "../entities/Servico.js";
import Usuario from "../entities/User.js";

export default class AgendamentosRepository {
  #banco;

  constructor() {
    this.#banco = new Database();
  }

 async listar(data = null, userId = null, status = null, tipo = null) {
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
        u.nome  as criado_por_nome,
        u.email as criado_por_email,
        u.telefone as criado_por_telefone
      from agendamentos a
      inner join servicos s on s.id = a.servico_id
      left  join users   u on u.id  = a.criado_por_user_id
      where 1=1
    `;
 
    const vals = [];
 
    if (userId) {
      sql += ` and a.criado_por_user_id = ? `;
      vals.push(userId);
    }
 
    if (data) {
      sql += ` and a.data = ? `;
      vals.push(data);
    }
 
    if (status) {
      sql += ` and a.status = ? `;
      vals.push(status);
    }
 
    if (tipo) {
      sql += ` and a.tipo = ? `;
      vals.push(tipo);
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

  const toMin = (t) => {
    const [h, m] = String(t).slice(0, 8).split(":").map(Number);
    return (h * 60) + m;
  };

  try {
    data = String(data).slice(0, 10);
    horaInicio = String(horaInicio).slice(0, 8);

    const servicoIdNum = Number(servicoId);
    const userIdNum = Number(userId);

    if (!servicoIdNum || Number.isNaN(servicoIdNum)) {
      throw new Error("Serviço inválido");
    }

    if (!userIdNum || Number.isNaN(userIdNum)) {
      throw new Error("Usuário inválido");
    }

    // ===== diagnóstico de banco atual =====
    const dbRows = await tx.query(`select database() as db`);
    console.log("Banco atual da transação:", dbRows?.[0]?.db);

    // ===== serviço =====
    const servRows = await tx.query(
      `select id, nome, duracao_min, ativo, exclusivo_para_consultora
       from servicos
       where id = ?
       limit 1`,
      [servicoIdNum]
    );

    console.log("Serviço buscado:", servicoIdNum);
    console.log("Resultado serviço:", servRows);

    if (!Array.isArray(servRows) || servRows.length === 0) {
      throw new Error(`Serviço não encontrado. ID recebido: ${servicoIdNum}`);
    }

    const servico = servRows[0];

    if (Number(servico.ativo) !== 1) {
      throw new Error("Serviço inativo");
    }

    const duracaoMin = Number(servico.duracao_min);
    const horaFim = this.#somarMinutos(horaInicio, duracaoMin);

    // ===== configuração da agenda =====
    const cfgRows = await tx.query(
      `select *
       from horario_config
       where id = 1
       limit 1`
    );

    console.log("Resultado config agenda:", cfgRows);

    if (!Array.isArray(cfgRows) || cfgRows.length === 0) {
      throw new Error("Configuração da agenda não encontrada");
    }

    const cfg = cfgRows[0];

    // ===== identificar tipo do dia =====
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

    // ===== validação horário agenda =====
    if (toMin(horaInicio) < toMin(inicioPadrao) || toMin(horaFim) > toMin(fimPadrao)) {
      throw new Error("Horário fora da agenda padrão");
    }

    // ===== exceções aplicáveis =====
    const excRows = await tx.query(
      `select id, data, hora_inicio_excecao, hora_fim_excecao, recorrente, dias_semana
       from excecoes_dia
       where (recorrente = 0 and data = ?)
          or (recorrente = 1)`,
      [data]
    );

    if (Array.isArray(excRows) && excRows.length > 0) {
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

        const inicioAgMin = toMin(horaInicio);
        const fimAgMin = toMin(horaFim);
        const inicioExcMin = toMin(inicioExc);
        const fimExcMin = toMin(fimExc);

        const temSobreposicao = inicioAgMin < fimExcMin && fimAgMin > inicioExcMin;

        if (temSobreposicao) {
          throw new Error("Horário indisponível por exceção da agenda");
        }
      }
    }

    // ===== gerar slots do agendamento =====
    const slots = this.#gerarSlots(
      horaInicio,
      horaFim,
      Number(cfg.duracao_slot_minutos)
    );

    if (!slots.length) {
      throw new Error("Não foi possível gerar os slots do agendamento");
    }

    // ===== bloqueio manual =====
    const bloqRows = await tx.query(
      `select slot
       from bloqueios_slot
       where data = ?
         and slot in (${slots.map(() => "?").join(",")})`,
      [data, ...slots]
    );

    if (Array.isArray(bloqRows) && bloqRows.length > 0) {
      throw new Error("Existe bloqueio nesse horário");
    }

    // ===== slot ocupado =====
    const ocupRows = await tx.query(
      `select slot
       from agendamento_slots
       where data = ?
         and status = 'ativo'
         and slot in (${slots.map(() => "?").join(",")})
       limit 1`,
      [data, ...slots]
    );

    if (Array.isArray(ocupRows) && ocupRows.length > 0) {
      throw new Error("Já existe agendamento nesse horário");
    }

    // ===== criar agendamento =====
    const agResult = await tx.query(
      `insert into agendamentos
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
      values (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "individual",
        servicoIdNum,
        data,
        horaInicio,
        horaFim,
        "confirmado",
        observacao ?? null,
        userIdNum
      ]
    );

    const agendamentoId = agResult.insertId;

    // ===== participante =====
    await tx.query(
      `insert into agendamento_participantes
      (agendamento_id, user_id, nome_no_momento)
      values (?, ?, ?)`,
      [agendamentoId, userIdNum, nomeUser]
    );

    // ===== reservar slots =====
    for (const slot of slots) {
      await tx.query(
        `insert into agendamento_slots
        (data, slot, agendamento_id, status)
        values (?, ?, ?, 'ativo')`,
        [data, slot, agendamentoId]
      );
    }

    await tx.commit();
    return agendamentoId;
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

  async cancelar(id) {
  const tx = await this.#banco.getConnectionTx();

  try {
    const rows = await tx.query(
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
  a.criadoPor.email = row["criado_por_email"];       // ← adiciona
  a.criadoPor.telefone = row["criado_por_telefone"]; // ← adiciona

  return a;
}
}