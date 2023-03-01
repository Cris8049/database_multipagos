var mysql = require("mysql");

const executeQuery = (query, callback, con) => con.query(query, callback);
const getUsers = (callback) => {
  var con = mysql.createConnection({
    host: 'sql768.main-hosting.eu',
        user: 'u196779987_multipagos',
        password: 'X~gOfg?B|C1a',
        database: 'uu196779987_multipagos',
  });

  con.connect(function (err) {
    if (err) throw err;
    console.log("Conectado con MYSQL...");
  });
  executeQuery(
    "SELECT * from `contacts`",
    (err, rows) => {
      if (err) throw err;
      callback(rows);
    },
    con
  );
  con.end();
};

module.exports = {
  executeQuery,
  getUsers,
};
