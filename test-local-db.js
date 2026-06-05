/* eslint-disable @typescript-eslint/no-require-imports */
const mysql = require('mysql2/promise');

async function test() {
  console.log("Probando conexión a base de datos LOCAL...");
  const config = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'nakamabo_wp369'
  };

  try {
    const connection = await mysql.createConnection(config);
    console.log("¡Conexión exitosa!");
    
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM wpr8_posts');
    console.log(`Número de posts en la base local: ${rows[0].count}`);
    
    await connection.end();
  } catch (err) {
    console.error("Error conectando a la base local:", err.message);
  }
}

test();
