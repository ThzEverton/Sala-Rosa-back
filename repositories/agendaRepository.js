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
      set hora_inicio_padrao=?, hora_fim_padrao=?, duracao_slot_minutos=?
      where id=1
    `;
    const vals = [ent.horaInicioPadrao, ent.horaFimPadrao, ent.duracaoSlotMinutos];
    return await this.#banco.ExecutaComandoNonQuery(sql, vals);
  }

  async listarExcecoes() {
    const sql = `select * from excecoes_dia order by data desc`;
    const rows = await this.#banco.ExecutaComando(sql, []);
    return rows.map(r => this.toMapExcecao(r));
  }

  async salvarExcecao(ent) {
    const sql = `
      insert into excecoes_dia (data, hora_inicio_excecao, hora_fim_excecao)
      values (?, ?, ?)
      on duplicate key update
        hora_inicio_excecao=values(hora_inicio_excecao),
        hora_fim_excecao=values(hora_fim_excecao)
    `;
    const vals = [ent.data, ent.horaInicioExcecao, ent.horaFimExcecao];
    return await this.#banco.ExecutaComandoNonQuery(sql, vals);
  }

  async removerExcecao(data) {
    const sql = `delete from excecoes_dia where data = ?`;
    return await this.#banco.ExecutaComandoNonQuery(sql, [data]);
  }

  async listarBloqueios() {
    const sql = `select * from bloqueios_slot order by data desc, slot asc`;
    const rows = await this.#banco.ExecutaComando(sql, []);
    return rows.map(r => this.toMapBloqueio(r));
  }

async existeBloqueio(data, slot) {
  const sql = `
    select id, data, slot
    from bloqueios_slot
    where data = ? and slot = ?
    limit 1
  `;

  console.log('EXISTE BLOQUEIO - ENTRADA:', { data, slot });

  const rows = await this.#banco.ExecutaComando(sql, [data, slot]);

  console.log('EXISTE BLOQUEIO - SAIDA:', rows);

  return rows.length > 0;
}

async toggleBloqueio(data, slot) {
  data = String(data).slice(0, 10);
  slot = String(slot).slice(0, 8);

  const existe = await this.existeBloqueio(data, slot);
  console.log('TOGGLE:', { data, slot, existe });

  if (existe) {
    const delSql = `delete from bloqueios_slot where data = ? and slot = ?`;
    await this.#banco.ExecutaComandoNonQuery(delSql, [data, slot]);
    return false;
  }

  const insSql = `insert into bloqueios_slot (data, slot) values (?, ?)`;
  await this.#banco.ExecutaComandoNonQuery(insSql, [data, slot]);
  return true;
}
  toMapConfig(row) {
    let c = new HorarioConfig();
    c.id = row["id"];
    c.horaInicioPadrao = row["hora_inicio_padrao"];
    c.horaFimPadrao = row["hora_fim_padrao"];
    c.duracaoSlotMinutos = row["duracao_slot_minutos"];
    return c;
  }

  toMapExcecao(row) {
    let e = new ExcecaoDia();
    e.data = row["data"];
    e.horaInicioExcecao = row["hora_inicio_excecao"];
    e.horaFimExcecao = row["hora_fim_excecao"];
    return e;
  }

  toMapBloqueio(row) {
    let b = new BloqueioSlot();
    b.data = row["data"];
    b.slot = row["slot"];
    return b;
  }
}