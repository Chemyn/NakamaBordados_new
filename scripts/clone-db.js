/* eslint-disable @typescript-eslint/no-require-imports */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Basic .env parser
function parseEnv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const env = {};
  lines.forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      env[key] = value.trim();
    }
  });
  return env;
}

async function clone() {
  const envPath = path.join(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('No se encontró .env.local');
    process.exit(1);
  }

  const env = parseEnv(envPath);

  const remoteConfig = {
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_NAME,
    connectTimeout: 60000,
  };

  const localConfig = {
    host: 'localhost',
    user: 'root',
    password: '', 
    connectTimeout: 60000,
  };

  console.log(`Conectando a la base remota: ${remoteConfig.host}...`);
  let remoteConn;
  try {
    remoteConn = await mysql.createConnection(remoteConfig);
    await remoteConn.query('SET SESSION wait_timeout = 28800');
    await remoteConn.query('SET SESSION interactive_timeout = 28800');
    console.log('¡Conexión remota exitosa!');
  } catch (err) {
    console.error('Error conectando a la base remota:', err.message);
    process.exit(1);
  }

  console.log('Conectando a MySQL local...');
  let localConn;
  try {
    localConn = await mysql.createConnection(localConfig);
    await localConn.query('SET GLOBAL max_allowed_packet = 1024 * 1024 * 256'); // 256MB
    await localConn.query('SET SESSION wait_timeout = 28800');
    await localConn.query("SET SESSION sql_mode = ''");
    console.log('¡Conexión local exitosa!');
  } catch (err) {
    console.error('Error conectando a MySQL local:', err.message);
    await remoteConn.end();
    process.exit(1);
  }

  try {
    console.log(`Creando base de datos local: ${env.DB_NAME}...`);
    await localConn.query(`CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\``);
    await localConn.query(`USE \`${env.DB_NAME}\``);

    await localConn.query('SET FOREIGN_KEY_CHECKS = 0');
    await localConn.query("SET SESSION sql_mode = ''");

    const [tables] = await remoteConn.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);

    for (const tableName of tableNames) {
      const [checkTable] = await localConn.query(`SHOW TABLES LIKE '${tableName}'`);
      if (checkTable.length > 0) {
        const [localRows] = await localConn.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
        if (localRows[0].count > 0) {
          console.log(`Saltando tabla ya clonada: ${tableName} (${localRows[0].count} filas)`);
          continue;
        }
      }

      console.log(`Clonando tabla: ${tableName}...`);
      
      // Get schema
      const [[createResult]] = await remoteConn.query(`SHOW CREATE TABLE \`${tableName}\``);
      const createSql = createResult['Create Table'];
      
      await localConn.query(`DROP TABLE IF EXISTS \`${tableName}\``);
      await localConn.query(createSql);

      // Get data
      const [rows] = await remoteConn.query(`SELECT * FROM \`${tableName}\``);
      
      if (rows.length > 0) {
        // Adjust batch size based on table
        let batchSize = 100;
        if (tableName.endsWith('_posts') || tableName.endsWith('_options')) {
          batchSize = 10; // Smaller batches for potentially huge rows
        }

        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          const keys = Object.keys(batch[0]).map(k => `\`${k}\``).join(', ');
          const values = batch.map(row => Object.values(row));
          const placeholder = batch.map(() => `(${Object.values(batch[0]).map(() => '?').join(', ')})`).join(', ');
          
          const flatValues = values.reduce((acc, val) => acc.concat(val), []);
          try {
            await localConn.query(`INSERT INTO \`${tableName}\` (${keys}) VALUES ${placeholder}`, flatValues);
          } catch (insertErr) {
             console.error(`Error insertando batch en ${tableName}:`, insertErr.message);
             // Try one by one if batch fails
             for (const row of batch) {
               const rowKeys = Object.keys(row).map(k => `\`${k}\``).join(', ');
               const rowValues = Object.values(row);
               const rowPlaceholder = `(${rowValues.map(() => '?').join(', ')})`;
               try {
                 await localConn.query(`INSERT IGNORE INTO \`${tableName}\` (${rowKeys}) VALUES ${rowPlaceholder}`, rowValues);
               } catch (singleErr) {
                 console.error(`  - Fallo total en fila de ${tableName}:`, singleErr.message);
               }
             }
          }
        }
        console.log(`  - ${rows.length} filas procesadas.`);
      } else {
        console.log(`  - Tabla vacía.`);
      }
    }

    console.log('\n¡Réplica completada con éxito!');
  } catch (err) {
    console.error('Error durante la clonación:', err);
  } finally {
    await remoteConn.end();
    await localConn.end();
  }
}

clone();
