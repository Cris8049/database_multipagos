var mysql = require('mysql');

    var con = mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'u894343298_Pruebas',
    })
    
    con.connect(function(err) {
        if (err) throw err;
        console.log("Connected!");
        var users = (id, phone,message , status) => {
            con.query("INSERT INTO contacts ( phone, message,data,status) VALUES ('68914931','Hola Verónica','1','404')")
            //con.query("UPDATE contacts SET status='503' WHERE id='3'")
        }
        con.query(users, function (err, result) {
          if (err) throw err;
          console.log("1 record inserted");
        });
      });

   // con.end()