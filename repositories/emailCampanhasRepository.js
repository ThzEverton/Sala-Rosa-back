import Database from "../db/database.js";

export default class EmailCampanhasRepository {
  #banco;

  constructor() {
    this.#banco = new Database();
  }

  async garantirTabelas() {
    await this.#banco.ExecutaComandoNonQuery(`
      create table if not exists email_campanhas (
        id int not null auto_increment,
        titulo varchar(160) not null,
        assunto varchar(180) not null,
        mensagem text not null,
        imagem_url varchar(500) null,
        incluir_servicos tinyint(1) not null default 0,
        personalizar_historico tinyint(1) not null default 0,
        criado_por_user_id int null,
        total_destinatarios int not null default 0,
        total_enviados int not null default 0,
        total_erros int not null default 0,
        ultimo_envio_em datetime null,
        created_at timestamp not null default current_timestamp,
        updated_at timestamp null default null on update current_timestamp,
        primary key (id),
        key idx_ec_criado_por (criado_por_user_id),
        key idx_ec_ultimo_envio (ultimo_envio_em),
        constraint fk_ec_criado_por
          foreign key (criado_por_user_id) references users(id)
          on delete set null
          on update cascade
      ) engine=InnoDB
    `);

    const colunas = await this.#banco.ExecutaComando(`
      select column_name as columnName
      from information_schema.columns
      where table_schema = database()
        and table_name = 'email_campanhas'
        and column_name in ('incluir_servicos', 'personalizar_historico')
    `);
    const colunasExistentes = new Set(colunas.map((c) => c.columnName));

    if (!colunasExistentes.has("incluir_servicos")) {
      await this.#banco.ExecutaComandoNonQuery(`
        alter table email_campanhas
        add column incluir_servicos tinyint(1) not null default 0 after imagem_url
      `);
    }

    if (!colunasExistentes.has("personalizar_historico")) {
      await this.#banco.ExecutaComandoNonQuery(`
        alter table email_campanhas
        add column personalizar_historico tinyint(1) not null default 0 after incluir_servicos
      `);
    }

    await this.#banco.ExecutaComandoNonQuery(`
      create table if not exists email_campanha_envios (
        id int not null auto_increment,
        campanha_id int not null,
        user_id int null,
        nome varchar(120) null,
        email varchar(160) not null,
        status enum('enviado', 'erro') not null,
        erro varchar(500) null,
        enviado_em timestamp not null default current_timestamp,
        primary key (id),
        key idx_ece_campanha (campanha_id),
        key idx_ece_user (user_id),
        constraint fk_ece_campanha
          foreign key (campanha_id) references email_campanhas(id)
          on delete cascade
          on update cascade,
        constraint fk_ece_user
          foreign key (user_id) references users(id)
          on delete set null
          on update cascade
      ) engine=InnoDB
    `);
  }

  async listarCampanhas() {
    await this.garantirTabelas();

    const rows = await this.#banco.ExecutaComando(`
      select
        ec.*,
        u.nome as criado_por_nome
      from email_campanhas ec
      left join users u on u.id = ec.criado_por_user_id
      order by ec.created_at desc
    `);

    return rows.map((r) => this.#mapCampanha(r));
  }

  async obterCampanha(id) {
    await this.garantirTabelas();

    const rows = await this.#banco.ExecutaComando(
      `
      select
        ec.*,
        u.nome as criado_por_nome
      from email_campanhas ec
      left join users u on u.id = ec.criado_por_user_id
      where ec.id = ?
      limit 1
      `,
      [id]
    );

    return rows.length ? this.#mapCampanha(rows[0]) : null;
  }

  async criarCampanha({ titulo, assunto, mensagem, imagemUrl, incluirServicos, personalizarHistorico, criadoPorUserId }) {
    await this.garantirTabelas();

    return await this.#banco.ExecutaComandoLastInserted(
      `
      insert into email_campanhas
        (titulo, assunto, mensagem, imagem_url, incluir_servicos, personalizar_historico, criado_por_user_id)
      values (?, ?, ?, ?, ?, ?, ?)
      `,
      [titulo, assunto, mensagem, imagemUrl || null, incluirServicos ? 1 : 0, personalizarHistorico ? 1 : 0, criadoPorUserId || null]
    );
  }

  async obterDestaqueHistoricoCliente(clienteId) {
    const id = Number(clienteId);
    if (!Number.isInteger(id) || id <= 0) return null;

    const produtos = await this.#banco.ExecutaComando(
      `
      select
        p.nome,
        sum(vi.quantidade) as total,
        max(v.data) as ultima_data
      from vendas v
      join venda_itens vi on vi.venda_id = v.id and vi.tipo = 'produto'
      join produtos p on p.id = vi.produto_id
      where v.cliente_id = ?
        and v.status_pagto not in ('cancelado', 'estornado')
        and p.ativo = 1
      group by p.id, p.nome
      having total >= 2 and ultima_data >= date_sub(curdate(), interval 365 day)
      order by total desc, ultima_data desc
      limit 1
      `,
      [id]
    );

    if (produtos.length) {
      return {
        tipo: "produto",
        nome: produtos[0].nome,
        total: Number(produtos[0].total || 0),
      };
    }

    const servicos = await this.#banco.ExecutaComando(
      `
      select
        s.nome,
        count(*) as total,
        max(a.data) as ultima_data
      from agendamento_participantes ap
      join agendamentos a on a.id = ap.agendamento_id
      join servicos s on s.id = a.servico_id
      where ap.user_id = ?
        and a.status in ('confirmado', 'concluido', 'aprovado')
        and s.ativo = 1
      group by s.id, s.nome
      having total >= 2 and ultima_data >= date_sub(curdate(), interval 365 day)
      order by total desc, ultima_data desc
      limit 1
      `,
      [id]
    );

    if (servicos.length) {
      return {
        tipo: "servico",
        nome: servicos[0].nome,
        total: Number(servicos[0].total || 0),
      };
    }

    return null;
  }

  async listarClientesComEmail({ clienteIds = [], todosClientes = false } = {}) {
    const ids = clienteIds.map(Number).filter((id) => Number.isInteger(id) && id > 0);

    const where = [
      "perfil = 'cliente'",
      "ativo = 1",
      "email is not null",
      "trim(email) <> ''",
    ];
    const params = [];

    if (!todosClientes) {
      if (!ids.length) return [];
      where.push(`id in (${ids.map(() => "?").join(",")})`);
      params.push(...ids);
    }

    const rows = await this.#banco.ExecutaComando(
      `
      select id, nome, email
      from users
      where ${where.join(" and ")}
      order by nome
      `,
      params
    );

    return rows.map((r) => ({
      id: r.id,
      nome: r.nome,
      email: r.email,
    }));
  }

  async registrarResultadoEnvio(campanhaId, resultados) {
    await this.garantirTabelas();

    const tx = await this.#banco.getConnectionTx();
    try {
      for (const r of resultados) {
        await tx.query(
          `
          insert into email_campanha_envios
            (campanha_id, user_id, nome, email, status, erro)
          values (?, ?, ?, ?, ?, ?)
          `,
          [
            campanhaId,
            r.userId || null,
            r.nome || null,
            r.email,
            r.status,
            r.erro || null,
          ]
        );
      }

      const totalDestinatarios = resultados.length;
      const totalEnviados = resultados.filter((r) => r.status === "enviado").length;
      const totalErros = resultados.filter((r) => r.status === "erro").length;

      await tx.query(
        `
        update email_campanhas
        set
          total_destinatarios = total_destinatarios + ?,
          total_enviados = total_enviados + ?,
          total_erros = total_erros + ?,
          ultimo_envio_em = now()
        where id = ?
        `,
        [totalDestinatarios, totalEnviados, totalErros, campanhaId]
      );

      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  #mapCampanha(row) {
    return {
      id: row.id,
      titulo: row.titulo,
      assunto: row.assunto,
      mensagem: row.mensagem,
      imagemUrl: row.imagem_url,
      incluirServicos: Boolean(row.incluir_servicos),
      personalizarHistorico: Boolean(row.personalizar_historico),
      criadoPorUserId: row.criado_por_user_id,
      criadoPorNome: row.criado_por_nome || null,
      totalDestinatarios: Number(row.total_destinatarios || 0),
      totalEnviados: Number(row.total_enviados || 0),
      totalErros: Number(row.total_erros || 0),
      ultimoEnvioEm: row.ultimo_envio_em,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
