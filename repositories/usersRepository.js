import Database from "../db/database.js";
import Usuario from "../entities/User.js";
import bcrypt from "bcryptjs";

export default class UsersRepository {
  #banco;

  constructor() {
    this.#banco = new Database();
  }

  #senhaPareceHash(senha) {
    return typeof senha === "string" && /^\$2[aby]\$\d{2}\$/.test(senha);
  }

  async #hashSenha(senha) {
    if (!senha) return senha;
    if (this.#senhaPareceHash(senha)) return senha;
    return await bcrypt.hash(String(senha), 10);
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
      await this.#hashSenha(ent.senha)
    ];

    const result = await this.#banco.ExecutaComando(sql, vals);
    return { insertId: result.insertId };
  }

  async atualizar(ent) {
    const vals = [
      ent.nome, ent.email, ent.telefone, ent.dataNascimento,
      ent.perfil,
      ent.isConsultora ? 1 : 0,
      ent.ativo ? 1 : 0
    ];

    let sql = `
      update users
      set nome=?, email=?, telefone=?, data_nascimento=?, perfil=?, is_consultora=?, ativo=?
    `;

    if (ent.senha) {
      sql += `, senha=?`;
      vals.push(await this.#hashSenha(ent.senha));
    }

    sql += ` where id=?`;
    vals.push(ent.id);

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
      where email = ?
      limit 1
    `;
    const rows = await this.#banco.ExecutaComando(sql, [email]);
    if (!rows.length) return null;

    const row = rows[0];
    const senhaSalva = row["senha"];
    let senhaValida = false;

    if (this.#senhaPareceHash(senhaSalva)) {
      senhaValida = await bcrypt.compare(String(senha), senhaSalva);
    } else {
      senhaValida = String(senhaSalva || "") === String(senha);

      if (senhaValida) {
        await this.atualizarSenha(row["id"], senha);
        row["senha"] = await this.#hashSenha(senha);
      }
    }

    return senhaValida ? this.toMap(row) : null;
  }

  async atualizarSenha(id, senha) {
    const sql = `update users set senha = ? where id = ?`;
    return await this.#banco.ExecutaComandoNonQuery(sql, [
      await this.#hashSenha(senha),
      id
    ]);
  }

  async garantirTabelaResetSenha() {
    const sql = `
      create table if not exists password_reset_tokens (
        id int not null auto_increment,
        user_id int not null,
        token_hash varchar(64) not null,
        expires_at datetime not null,
        used_at datetime null,
        created_at timestamp not null default current_timestamp,
        primary key (id),
        unique key uq_prt_token_hash (token_hash),
        key idx_prt_user (user_id),
        constraint fk_prt_user
          foreign key (user_id) references users(id)
          on delete cascade
      ) engine=InnoDB
    `;

    return await this.#banco.ExecutaComandoNonQuery(sql);
  }

  async invalidarTokensResetSenhaDoUsuario(userId) {
    await this.garantirTabelaResetSenha();

    const sql = `
      update password_reset_tokens
      set used_at = now()
      where user_id = ? and used_at is null
    `;

    return await this.#banco.ExecutaComandoNonQuery(sql, [userId]);
  }

  async criarTokenResetSenha(userId, tokenHash, minutosValidade = 30) {
    await this.garantirTabelaResetSenha();
    await this.invalidarTokensResetSenhaDoUsuario(userId);

    const sql = `
      insert into password_reset_tokens (user_id, token_hash, expires_at)
      values (?, ?, date_add(now(), interval ? minute))
    `;

    return await this.#banco.ExecutaComandoLastInserted(sql, [
      userId,
      tokenHash,
      minutosValidade
    ]);
  }

  async obterTokenResetSenhaValido(tokenHash) {
    await this.garantirTabelaResetSenha();

    const sql = `
      select prt.id, prt.user_id, u.nome, u.email, u.ativo
      from password_reset_tokens prt
      inner join users u on u.id = prt.user_id
      where prt.token_hash = ?
        and prt.used_at is null
        and prt.expires_at > now()
      limit 1
    `;

    const rows = await this.#banco.ExecutaComando(sql, [tokenHash]);
    return rows.length ? rows[0] : null;
  }

  async marcarTokenResetSenhaComoUsado(id) {
    const sql = `
      update password_reset_tokens
      set used_at = now()
      where id = ? and used_at is null
    `;

    return await this.#banco.ExecutaComandoNonQuery(sql, [id]);
  }

  async toggleAtivo(id) {
    const sql = `update users set ativo = 1 - ativo where id = ?`;
    return await this.#banco.ExecutaComandoNonQuery(sql, [id]);
  }

  #formatarDataISO(valor) {
    if (!valor) return null;
    if (typeof valor === "string") return valor.slice(0, 10);

    if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
      const ano = valor.getFullYear();
      const mes = String(valor.getMonth() + 1).padStart(2, "0");
      const dia = String(valor.getDate()).padStart(2, "0");
      return `${ano}-${mes}-${dia}`;
    }

    return String(valor).slice(0, 10);
  }

  toMap(row) {
    let u = new Usuario();
    u.id = row["id"];
    u.nome = row["nome"];
    u.email = row["email"];
    u.telefone = row["telefone"];
    u.dataNascimento = this.#formatarDataISO(row["data_nascimento"]);
    u.perfil = row["perfil"];
    u.isConsultora = row["is_consultora"] == 1;
    u.ativo = row["ativo"] == 1;
    u.senha = row["senha"];
    return u;
  }
}
