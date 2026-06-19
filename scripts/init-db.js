const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Parse .env.local file
function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('⚠️ No .env.local file found at:', filePath);
    return {};
  }
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

async function main() {
  const envPath = path.join(__dirname, '../.env.local');
  const env = parseEnv(envPath);

  const dbConfig = {
    host: env.DB_HOST || 'localhost',
    user: env.DB_USER || 'root',
    password: env.DB_PASS || '',
    database: env.DB_NAME || 'nakamabo_wp369'
  };

  console.log(`Connecting to local MySQL server: ${dbConfig.host}...`);
  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });
    console.log('✔ Connected to MySQL server.');
  } catch (err) {
    console.error('❌ Failed to connect to MySQL server:', err.message);
    process.exit(1);
  }

  try {
    console.log(`Creating database if not exists: \`${dbConfig.database}\`...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    await connection.query(`USE \`${dbConfig.database}\``);

    console.log('Setting up tables...');

    // 1. Settings Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`settings\` (
        \`key_name\` VARCHAR(100) PRIMARY KEY,
        \`value\` TEXT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Users Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`email\` VARCHAR(255) UNIQUE NOT NULL,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`first_name\` VARCHAR(100),
        \`last_name\` VARCHAR(100),
        \`phone\` VARCHAR(20),
        \`role\` VARCHAR(20) DEFAULT 'customer',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Addresses Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`addresses\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`address_type\` VARCHAR(20) DEFAULT 'shipping',
        \`street_address\` VARCHAR(255) NOT NULL,
        \`apartment\` VARCHAR(100),
        \`city\` VARCHAR(100) NOT NULL,
        \`state\` VARCHAR(100) NOT NULL,
        \`postal_code\` VARCHAR(20) NOT NULL,
        \`country\` VARCHAR(10) DEFAULT 'MX',
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Categories Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`categories\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL,
        \`slug\` VARCHAR(100) UNIQUE NOT NULL,
        \`parent_id\` INT DEFAULT NULL,
        FOREIGN KEY (\`parent_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Products Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`products\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`slug\` VARCHAR(255) UNIQUE NOT NULL,
        \`description\` TEXT,
        \`short_description\` TEXT,
        \`price\` DECIMAL(10,2) NOT NULL,
        \`regular_price\` DECIMAL(10,2) NOT NULL,
        \`sale_price\` DECIMAL(10,2) DEFAULT NULL,
        \`image_url\` VARCHAR(512),
        \`status\` VARCHAR(20) DEFAULT 'publish',
        \`rating\` DECIMAL(3,2) DEFAULT 5.00,
        \`sales_count\` INT DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Product Gallery Images Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`product_images\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`product_id\` INT NOT NULL,
        \`image_url\` VARCHAR(512) NOT NULL,
        \`sort_order\` INT DEFAULT 0,
        FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Product-Category Mapping Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`product_category_mapping\` (
        \`product_id\` INT NOT NULL,
        \`category_id\` INT NOT NULL,
        PRIMARY KEY (\`product_id\`, \`category_id\`),
        FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 8. Product Variations Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`product_variations\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`product_id\` INT NOT NULL,
        \`sku\` VARCHAR(100) UNIQUE NOT NULL,
        \`price\` DECIMAL(10,2) NOT NULL,
        \`image_url\` VARCHAR(512) DEFAULT NULL,
        \`stock_quantity\` INT DEFAULT 10,
        FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. Variation Attributes Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`product_variation_attributes\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`variation_id\` INT NOT NULL,
        \`name\` VARCHAR(50) NOT NULL,
        \`value\` VARCHAR(100) NOT NULL,
        FOREIGN KEY (\`variation_id\`) REFERENCES \`product_variations\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 10. Coupons Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`coupons\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`code\` VARCHAR(50) UNIQUE NOT NULL,
        \`type\` VARCHAR(20) DEFAULT 'percent',
        \`amount\` DECIMAL(10,2) NOT NULL,
        \`status\` VARCHAR(20) DEFAULT 'active',
        \`expiration_date\` TIMESTAMP NULL DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 11. Orders Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`orders\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT DEFAULT NULL,
        \`order_number\` VARCHAR(50) UNIQUE NOT NULL,
        \`status\` VARCHAR(50) DEFAULT 'pending',
        \`total\` DECIMAL(10,2) NOT NULL,
        \`subtotal\` DECIMAL(10,2) NOT NULL,
        \`shipping_cost\` DECIMAL(10,2) DEFAULT 0.00,
        \`discount_amount\` DECIMAL(10,2) DEFAULT 0.00,
        \`coupon_code\` VARCHAR(50) DEFAULT NULL,
        \`email\` VARCHAR(255) NOT NULL,
        \`first_name\` VARCHAR(100) NOT NULL,
        \`last_name\` VARCHAR(100) NOT NULL,
        \`phone\` VARCHAR(20) NOT NULL,
        \`address_1\` VARCHAR(255) NOT NULL,
        \`address_2\` VARCHAR(100) DEFAULT NULL,
        \`city\` VARCHAR(100) NOT NULL,
        \`state\` VARCHAR(100) NOT NULL,
        \`postcode\` VARCHAR(20) NOT NULL,
        \`country\` VARCHAR(10) DEFAULT 'MX',
        \`tracking_code\` VARCHAR(100) DEFAULT NULL,
        \`tracking_carrier\` VARCHAR(50) DEFAULT NULL,
        \`payment_method\` VARCHAR(50) NOT NULL,
        \`payment_id\` VARCHAR(100) DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 12. Order Items Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`order_items\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`order_id\` INT NOT NULL,
        \`product_id\` INT NOT NULL,
        \`variation_id\` INT DEFAULT NULL,
        \`product_name\` VARCHAR(255) NOT NULL,
        \`quantity\` INT NOT NULL DEFAULT 1,
        \`price\` DECIMAL(10,2) NOT NULL,
        \`selected_attributes\` JSON DEFAULT NULL,
        FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✔ All tables checked/created.');

    // Seed default settings
    console.log('Seeding settings...');
    await connection.query(`
      INSERT IGNORE INTO settings (key_name, value) VALUES
      ('maintenance_mode', 'false'),
      ('social_links', '{"facebook": "https://facebook.com/nakamabordados", "instagram": "https://instagram.com/nakama.bordados", "tiktok": "https://tiktok.com/@nakamabordados"}'),
      ('maintenance_message', 'Estamos mejorando nuestra nave pirata. Volveremos pronto con nuevos tesoros.'),
      ('maintenance_image', 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1200&auto=format&fit=crop')
    `);
    console.log('✔ Settings seeded.');

    // Seed default categories
    console.log('Seeding categories...');
    const defaultCategories = [
      ['Anime', 'anime', null],
      ['Bordados', 'bordados', null],
      ['Estampados', 'estampados', null],
      ['Sudaderas', 'sudaderas', null],
      ['Hoodies', 'hoodies', null],
      ['One Piece', 'one-piece', null]
    ];
    for (const [name, slug, parentId] of defaultCategories) {
      await connection.query(
        'INSERT IGNORE INTO categories (name, slug, parent_id) VALUES (?, ?, ?)',
        [name, slug, parentId]
      );
    }
    console.log('✔ Categories seeded.');

    // Seed default administrator
    const adminEmail = 'josemlopez2310@gmail.com';
    const adminPassword = 'adminpassword123'; // Temporary password
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    const [existingAdmin] = await connection.query('SELECT * FROM users WHERE email = ?', [adminEmail]);
    if (existingAdmin.length === 0) {
      console.log(`Seeding admin user: ${adminEmail}...`);
      await connection.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, phone, role) 
        VALUES (?, ?, 'Chemyn', 'Lopez', '8180000000', 'admin')
      `, [adminEmail, passwordHash]);
      console.log('✔ Admin user created successfully!');
      console.log(`🔑 Credentials: Email: ${adminEmail} | Password: ${adminPassword}`);
      console.log('⚠️ Please change this password on first login.');
    } else {
      console.log('✔ Admin user already exists.');
    }

    // Seed mock sales data for dashboard test if orders table is empty
    const [existingOrders] = await connection.query('SELECT COUNT(*) as count FROM orders');
    if (existingOrders[0].count === 0) {
      console.log('Seeding mock orders for sales dashboard testing...');
      
      // Let's create a few products first to link items
      await connection.query(`
        INSERT IGNORE INTO products (id, name, slug, description, short_description, price, regular_price, image_url, status) VALUES
        (1, 'Hoodie Luffy Gear 5', 'luffy-gear5-hoodie', 'Hoodie de Luffy Gear 5', 'Hoodie Luffy Gear 5', 589.00, 589.00, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=600&auto=format&fit=crop', 'publish'),
        (2, 'T-Shirt Roronoa Zoro Onigashima', 'zoro-onigashima-tshirt', 'Camiseta de Zoro', 'Camiseta de Zoro', 399.00, 399.00, 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop', 'publish')
      `);

      const mockOrders = [
        // Today
        {
          order_number: '1001', status: 'completed', total: 1178.00, subtotal: 1178.00, shipping_cost: 0.00,
          email: 'pirate1@grandline.com', first_name: 'Monkey D.', last_name: 'Luffy', phone: '1234567890',
          address_1: 'Sunny Go', city: 'Foosha', state: 'East Blue', postcode: '00001', country: 'MX',
          payment_method: 'PayPal', created_at: new Date()
        },
        // This Month (but not today)
        {
          order_number: '1002', status: 'completed', total: 399.00, subtotal: 399.00, shipping_cost: 150.00,
          email: 'swordsman@grandline.com', first_name: 'Roronoa', last_name: 'Zoro', phone: '0987654321',
          address_1: 'Sunny Go Gym', city: 'Shimotsuki', state: 'East Blue', postcode: '00002', country: 'MX',
          payment_method: 'MercadoPago', created_at: new Date(new Date().setDate(new Date().getDate() - 5))
        },
        // Earlier this Year
        {
          order_number: '1003', status: 'completed', total: 988.00, subtotal: 988.00, shipping_cost: 0.00,
          email: 'navigator@grandline.com', first_name: 'Nami', last_name: 'Cat Burglar', phone: '1122334455',
          address_1: 'Tangerine Orchard', city: 'Cocoyasi', state: 'East Blue', postcode: '00003', country: 'MX',
          payment_method: 'PayPal', created_at: new Date(new Date().setMonth(new Date().getMonth() - 2))
        },
        // Last Year (should not count for this year's dashboard stats)
        {
          order_number: '0999', status: 'completed', total: 589.00, subtotal: 589.00, shipping_cost: 150.00,
          email: 'sniper@grandline.com', first_name: 'Usopp', last_name: 'Sogeking', phone: '5544332211',
          address_1: 'Syrub Village', city: 'Gecko Islands', state: 'East Blue', postcode: '00004', country: 'MX',
          payment_method: 'MercadoPago', created_at: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
        }
      ];

      for (let idx = 0; idx < mockOrders.length; idx++) {
        const order = mockOrders[idx];
        const [result] = await connection.query(`
          INSERT INTO orders (order_number, status, total, subtotal, shipping_cost, email, first_name, last_name, phone, address_1, city, state, postcode, country, payment_method, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          order.order_number, order.status, order.total, order.subtotal, order.shipping_cost,
          order.email, order.first_name, order.last_name, order.phone, order.address_1,
          order.city, order.state, order.postcode, order.country, order.payment_method, order.created_at
        ]);
        
        const orderId = result.insertId;

        // Add order items
        if (order.order_number === '1001') {
          await connection.query(`
            INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES
            (?, 1, 'Hoodie Luffy Gear 5', 2, 589.00)
          `, [orderId]);
        } else if (order.order_number === '1002') {
          await connection.query(`
            INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES
            (?, 2, 'T-Shirt Roronoa Zoro Onigashima', 1, 399.00)
          `, [orderId]);
        } else if (order.order_number === '1003') {
          await connection.query(`
            INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES
            (?, 1, 'Hoodie Luffy Gear 5', 1, 589.00),
            (?, 2, 'T-Shirt Roronoa Zoro Onigashima', 1, 399.00)
          `, [orderId, orderId]);
        } else if (order.order_number === '0999') {
          await connection.query(`
            INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES
            (?, 1, 'Hoodie Luffy Gear 5', 1, 589.00)
          `, [orderId]);
        }
      }
      console.log('✔ Mock orders seeded.');
    } else {
      console.log('✔ Orders already contain data, skipping seed.');
    }

  } catch (err) {
    console.error('❌ Database error during initialization:', err);
  } finally {
    await connection.end();
    console.log('Database initialization script finished.');
  }
}

main();
