import mysql from 'mysql2'

export default class Database {
  #pool;

  constructor() {
    this.#pool = mysql.createPool({
      host: '132.226.245.178',
      database: 'ATIVIDADE_10442417480',
      user: '10442417480',
      password: '10442417480',
      idleTimeout: 30000,
      connectionLimit: 50
    });
  }

  // normal (pool)
  ExecutaComando(sql, valores = []) {
    const pool = this.#pool;
    return new Promise((res, rej) => {
      pool.query(sql, valores, (error, results) => {
        if (error) rej(error);
        else res(results);
      });
    });
  }

  ExecutaComandoNonQuery(sql, valores = []) {
    const pool = this.#pool;
    return new Promise((res, rej) => {
      pool.query(sql, valores, (error, results) => {
        if (error) rej(error);
        else res(results.affectedRows > 0);
      });
    });
  }

  ExecutaComandoLastInserted(sql, valores = []) {
    const pool = this.#pool;
    return new Promise((res, rej) => {
      pool.query(sql, valores, (error, results) => {
        if (error) rej(error);
        else res(results.insertId);
      });
    });
  }

  // ✅ transação real (mesma conexão)
  async getConnectionTx() {
    const pool = this.#pool;
    const conn = await new Promise((res, rej) => {
      pool.getConnection((err, connection) => {
        if (err) rej(err);
        else res(connection);
      });
    });

    const exec = (sql, valores = []) => new Promise((res, rej) => {
      conn.query(sql, valores, (error, results) => {
        if (error) rej(error);
        else res(results);
      });
    });

    await exec("START TRANSACTION");

    return {
      query: exec,
      commit: async () => { await exec("COMMIT"); conn.release(); },
      rollback: async () => { await exec("ROLLBACK"); conn.release(); },
    };
  }
}