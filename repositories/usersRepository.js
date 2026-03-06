import Database from "../db/database.js";
import Usuario from "../entities/User.js";

export default class UsersRepository {
  #banco;

  constructor() {
    this.#banco = new Database();
  }

  async listar() {
    const sql = `select * from users order by nome`;
    const rows = await this.#banco.ExecutaComando(sql);
    return rows.map(r => this.toMap(r));
  }

  async obterPorId(id) {
    const sql = `select * from users where id = ? limit 1`;
    const rows = await this.#banco.ExecutaComando(sql, [id]);
    return rows.length ? this.toMap(rows[0]) : null;
  }

  async criar(ent) {
    const sql = `
    insert into users 
    (nome, email, telefone, data_nascimento, perfil, is_consultora, ativo, senha)
    values (?, ?, ?, ?, ?, ?, ?, ?)
  `;

    const vals = [
      ent.nome,
      ent.email,
      ent.telefone,
      ent.dataNascimento,
      ent.perfil,
      ent.isConsultora ? 1 : 0,
      ent.ativo ? 1 : 0,
      ent.senha
    ];

    return await this.#banco.ExecutaComandoNonQuery(sql, vals);
  }

  async atualizar(ent) {
    const sql = `
      update users
      set nome=?, email=?, telefone=?, data_nascimento=?, perfil=?, is_consultora=?, ativo=?
      where id=?
    `;
    const vals = [
      ent.nome, ent.email, ent.telefone, ent.dataNascimento,
      ent.perfil,
      ent.isConsultora ? 1 : 0,
      ent.ativo ? 1 : 0,
      ent.id
    ];
    return await this.#banco.ExecutaComandoNonQuery(sql, vals);
  }
  async obterPorEmail(email) {
    const sql = `select id, nome, email, perfil, is_consultora, ativo, senha
                 from users
                 where email = ?
                 limit 1`;
    const rows = await this.#banco.ExecutaComando(sql, [email]);

    if (rows.length === 0) return null;

    return this.toMap(rows[0]);
  }

  async validarAcesso(email, senha) {
    const sql = `
      select *
      from users
      where email = ? and senha = ?
      limit 1
    `;
    const rows = await this.#banco.ExecutaComando(sql, [email, senha]);
    return rows.length ? this.toMap(rows[0]) : null;
  }

  async toggleAtivo(id) {
    const sql = `update users set ativo = 1 - ativo where id = ?`;
    return await this.#banco.ExecutaComandoNonQuery(sql, [id]);
  }

  toMap(row) {
    let u = new Usuario();
    u.id = row["id"];
    u.nome = row["nome"];
    u.email = row["email"];
    u.telefone = row["telefone"];
    u.dataNascimento = row["data_nascimento"];
    u.perfil = row["perfil"];
    u.isConsultora = row["is_consultora"] == 1;
    u.ativo = row["ativo"] == 1;
    u.senha = row["senha"];
    return u;
  }
}