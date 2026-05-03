import mysql from "mysql2";

const pool = mysql.createPool({
  host: "10.0.0.143",
  database: "salarosa",
  user: "everton",
  password: "Everton2006$",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  idleTimeout: 30000
});
export default class Database {
  ExecutaComando(sql, valores = []) {
    return new Promise((res, rej) => {
      pool.query(sql, valores, (error, results) => {
        if (error) rej(error);
        else res(results);
      });
    });
  }

  ExecutaComandoNonQuery(sql, valores = []) {
    return new Promise((res, rej) => {
      pool.query(sql, valores, (error, results) => {
        if (error) rej(error);
        else res(results.affectedRows > 0);
      });
    });
  }

  ExecutaComandoLastInserted(sql, valores = []) {
    return new Promise((res, rej) => {
      pool.query(sql, valores, (error, results) => {
        if (error) rej(error);
        else res(results.insertId);
      });
    });
  }

  async getConnectionTx() {
    const conn = await new Promise((res, rej) => {
      pool.getConnection((err, connection) => {
        if (err) rej(err);
        else res(connection);
      });
    });

    const exec = (sql, valores = []) =>
      new Promise((res, rej) => {
        conn.query(sql, valores, (error, results) => {
          if (error) rej(error);
          else res(results);
        });
      });

    await exec("START TRANSACTION");

    return {
      query: exec,

      commit: async () => {
        try {
          await exec("COMMIT");
        } finally {
          conn.release();
        }
      },

      rollback: async () => {
        try {
          await exec("ROLLBACK");
        } finally {
          conn.release();
        }
      }
    };
  }
}