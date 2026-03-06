import mysql from 'mysql2'

export default class Database {
  #pool;

  constructor() {
    this.#pool = mysql.createPool({
      host: '127.0.0.1',
      database: 'salarosa',
      user: 'root',
      password: '',
      idleTimeout: 30000,
      connectionLimit: 50
    });
  }


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