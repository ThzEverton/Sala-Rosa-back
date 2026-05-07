import Database from "../db/database.js";
import HorarioConfig from "../entities/HorarioConfig.js";
import ExcecaoDia from "../entities/ExcecaoDia.js";
import BloqueioSlot from "../entities/BloqueioSlot.js";

export default class AgendaRepository {
  #banco;

  constructor() {
    this.#banco = new Database();
  }

  async obterConfig() {
    const sql = `select * from horario_config where id = 1 limit 1`;
    const rows = await this.#banco.ExecutaComando(sql, []);
    if (rows.length === 0) return null;
    return this.toMapConfig(rows[0]);
  }

  async atualizarConfig(ent) {
    const sql = `
      update horario_config
      set
        hora_inicio_semana = ?,
        hora_fim_semana = ?,
        hora_inicio_fim_semana = ?,
        hora_fim_fim_semana = ?,
        duracao_slot_minutos = ?
      where id = 1
    `;

    const vals = [
      ent.horaInicioSemana,
      ent.horaFimSemana,
      ent.horaInicioFimSemana,
      ent.horaFimFimSemana,
      ent.duracaoSlotMinutos,
    ];

    return await this.#banco.ExecutaComandoNonQuery(sql, vals);
  }

  async listarExcecoes() {
    const sql = `select * from excecoes_dia order by created_at desc`;
    const rows = await this.#banco.ExecutaComando(sql, []);
    return rows.map((r) => this.toMapExcecao(r));
  }

  async obterExcecaoPorData(data) {
    const sql = `select * from excecoes_dia where data = ? limit 1`;
    const rows = await this.#banco.ExecutaComando(sql, [data]);
    if (rows.length === 0) return null;
    return this.toMapExcecao(rows[0]);
  }

    async listarSlotsOcupadosPorData(data) {
  const sql = `
    select
      agendamento_slots.data,
      agendamento_slots.slot,
      agendamento_slots.status,
      ap.user_id as cliente_id,
      coalesce(ap.nome_no_momento, u.nome) as cliente_nome,
      u.email as cliente_email,
      u.telefone as cliente_telefone
    from agendamento_slots
    left join agendamento_participantes ap
      on ap.agendamento_id = agendamento_slots.agendamento_id
    left join users u
      on u.id = ap.user_id
    where agendamento_slots.data = ?
      and lower(trim(agendamento_slots.status)) in ('ativo', 'agendado', 'confirmado')
  `;

  return await this.#banco.ExecutaComando(sql, [String(data).slice(0, 10)]);
}

  async salvarExcecao(ent) {
    const sql = `
      INSERT INTO excecoes_dia 
        (data, hora_inicio_excecao, hora_fim_excecao, recorrente, dias_semana)
      VALUES (?, ?, ?, ?, ?)
    `;

    const vals = [
      ent.data,
      ent.horaInicioExcecao,
      ent.horaFimExcecao,
      ent.recorrente,
      ent.diasSemana,
    ];

    return await this.#banco.ExecutaComandoNonQuery(sql, vals);
  }

  // ✅ CORREÇÃO: remove por data (legado, mantido para compatibilidade)
  async removerExcecao(data) {
    const sql = `delete from excecoes_dia where data = ?`;
    return await this.#banco.ExecutaComandoNonQuery(sql, [data]);
  }

 
  async removerExcecaoPorId(id) {
    const sql = `delete from excecoes_dia where id = ?`;
    return await this.#banco.ExecutaComandoNonQuery(sql, [id]);
  }

  async listarBloqueios() {
    const sql = `select * from bloqueios_slot order by data desc, slot asc`;
    const rows = await this.#banco.ExecutaComando(sql, []);
    return rows.map((r) => this.toMapBloqueio(r));
  }

  async existeBloqueio(data, slot) {
    const sql = `
      select id from bloqueios_slot
      where data = ? and slot = ?
      limit 1
    `;
    const rows = await this.#banco.ExecutaComando(sql, [data, slot]);
    return rows.length > 0;
  }

  async toggleBloqueio(data, slot) {
    data = String(data).slice(0, 10);
    slot = String(slot).slice(0, 8);

    const existe = await this.existeBloqueio(data, slot);

    if (existe) {
      await this.#banco.ExecutaComandoNonQuery(
        `delete from bloqueios_slot where data = ? and slot = ?`,
        [data, slot]
      );
      return false;
    }

    await this.#banco.ExecutaComandoNonQuery(
      `insert into bloqueios_slot (data, slot) values (?, ?)`,
      [data, slot]
    );
    return true;
  }

  async toggleAtivoExcecao(id) {
    const sql = `UPDATE excecoes_dia SET ativo = NOT ativo WHERE id = ?`;
    return await this.#banco.ExecutaComandoNonQuery(sql, [id]);
  }

  toMapConfig(row) {
    let c = new HorarioConfig();
    c.id = row["id"];
    c.horaInicioPadrao = row["hora_inicio_padrao"];
    c.horaFimPadrao = row["hora_fim_padrao"];
    c.horaInicioSemana = row["hora_inicio_semana"];
    c.horaFimSemana = row["hora_fim_semana"];
    c.horaInicioFimSemana = row["hora_inicio_fim_semana"];
    c.horaFimFimSemana = row["hora_fim_fim_semana"];
    c.duracaoSlotMinutos = row["duracao_slot_minutos"];
    return c;
  }

  
  toMapExcecao(row) {
    let e = new ExcecaoDia();
    e.id = row["id"];
    e.data = row["data"];
    e.horaInicioExcecao = row["hora_inicio_excecao"];
    e.horaFimExcecao = row["hora_fim_excecao"];
    e.recorrente = row["recorrente"];
    e.diasSemana = row["dias_semana"];
    e.ativo = row["ativo"] ?? 1; // padrão ativo caso coluna não exista ainda
    return e;
  }

  toMapBloqueio(row) {
    let b = new BloqueioSlot();
    b.data = row["data"];
    b.slot = row["slot"];
    return b;
  }
}
