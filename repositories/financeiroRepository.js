import Database from "../db/database.js";
import FinanceiroLancamento from "../entities/financeiroLancamento.js";
import Usuario from "../entities/User.js";
import Venda from "../entities/Venda.js";
import Agendamento from "../entities/Agendamento.js";

export default class FinanceiroRepository {
  #banco;

  constructor() {
    this.#banco = new Database();
  }

  async listar() {
    const sql = `select * from financeiro_lancamentos order by data_ref desc, created_at desc`;
    const rows = await this.#banco.ExecutaComando(sql, []);
    return rows.map(r => this.toMap(r));
  }

  async listarDoUsuario(userId) {
    const sql = `
      select * from financeiro_lancamentos
      where user_id = ?
      order by data_ref desc, created_at desc
    `;
    const rows = await this.#banco.ExecutaComando(sql, [userId]);
    return rows.map(r => this.toMap(r));
  }

  async obterPorId(id) {
    const sql = `select * from financeiro_lancamentos where id=? limit 1`;
    const rows = await this.#banco.ExecutaComando(sql, [id]);
    return rows.length ? this.toMap(rows[0]) : null;
  }

  async marcarComoPago(id, formaPagto) {
    const sql = `
      update financeiro_lancamentos
      set status='pago', forma_pagto=?
      where id=?
    `;
    return await this.#banco.ExecutaComandoNonQuery(sql, [formaPagto, id]);
  }

  toMap(row) {
    let f = new FinanceiroLancamento();
    f.id = row["id"];
    f.descricao = row["descricao"];
    f.valor = row["valor"];
    f.formaPagto = row["forma_pagto"];
    f.status = row["status"];
    f.dataRef = row["data_ref"];

    f.usuario = new Usuario();
    f.usuario.id = row["user_id"];

    f.venda = new Venda();
    f.venda.id = row["venda_id"];

    f.agendamento = new Agendamento();
    f.agendamento.id = row["agendamento_id"];

    return f;
  }
}