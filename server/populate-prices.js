const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function populatePrices() {
  try {
    console.log('🚀 Filling database with default prices...');

    // 1. Create Укріплення category with sizes
    const укріпленняResult = await pool.query(`
      INSERT INTO service_categories (name, description, order_index, is_active)
      VALUES ('Укріплення', 'Укріплення нігтів різних розмірів', 1, true)
      RETURNING id
    `);
    const укріпленняId = укріпленняResult.rows[0].id;
    console.log(`✅ Category "Укріплення" created with ID: ${укріпленняId}`);

    const укріпленняSizes = [
      { name: 'Нульова', price: 100 },
      { name: 'S', price: 110 },
      { name: 'M', price: 120 },
      { name: 'L', price: 130 },
      { name: 'XL', price: 140 },
      { name: '2XL', price: 150 },
      { name: '3XL', price: 160 }
    ];

    for (const size of укріпленняSizes) {
      await pool.query(`
        INSERT INTO services (category_id, name, price, order_index, is_active)
        VALUES ($1, $2, $3, $4, true)
      `, [укріпленняId, `Укріплення ${size.name}`, size.price, укріпленняSizes.indexOf(size) + 1]);
      console.log(`  ✓ Added: Укріплення ${size.name} - ${size.price} zł`);
    }

    // 2. Create Нарощення category with sizes
    const нарощенняResult = await pool.query(`
      INSERT INTO service_categories (name, description, order_index, is_active)
      VALUES ('Нарощення', 'Нарощення нігтів різних розмірів', 2, true)
      RETURNING id
    `);
    const нарощенняId = нарощенняResult.rows[0].id;
    console.log(`✅ Category "Нарощення" created with ID: ${нарощенняId}`);

    const нарощенняSizes = [
      { name: 'Нульова', price: 130 },
      { name: 'S', price: 130 },
      { name: 'M', price: 150 },
      { name: 'L', price: 170 },
      { name: 'XL', price: 190 },
      { name: '2XL', price: 210 },
      { name: '3XL', price: 230 }
    ];

    for (const size of нарощенняSizes) {
      await pool.query(`
        INSERT INTO services (category_id, name, price, order_index, is_active)
        VALUES ($1, $2, $3, $4, true)
      `, [нарощенняId, `Нарощення ${size.name}`, size.price, нарощенняSizes.indexOf(size) + 1]);
      console.log(`  ✓ Added: Нарощення ${size.name} - ${size.price} zł`);
    }

    // 3. Create Дизайн category
    const дизайнResult = await pool.query(`
      INSERT INTO service_categories (name, description, order_index, is_active)
      VALUES ('Дизайн', 'Додаткові опції дизайну', 3, true)
      RETURNING id
    `);
    const дизайнId = дизайнResult.rows[0].id;
    console.log(`✅ Category "Дизайн" created with ID: ${дизайнId}`);

    const дизайнOptions = [
      { name: 'Однотонний', price: 0 },
      { name: 'Простий', price: 15 },
      { name: 'Середній', price: 25 },
      { name: 'Складний', price: 35 }
    ];

    for (const design of дизайнOptions) {
      await pool.query(`
        INSERT INTO services (category_id, name, price, order_index, is_active)
        VALUES ($1, $2, $3, $4, true)
      `, [дизайнId, design.name, design.price, дизайнOptions.indexOf(design) + 1]);
      console.log(`  ✓ Added: ${design.name} - ${design.price} zł`);
    }

    // 4. Create Покриття category
    const покриттяResult = await pool.query(`
      INSERT INTO service_categories (name, description, order_index, is_active)
      VALUES ('Покриття', 'Тип покриття', 4, true)
      RETURNING id
    `);
    const покриттяId = покриттяResult.rows[0].id;
    console.log(`✅ Category "Покриття" created with ID: ${покриттяId}`);

    const покриттяOptions = [
      { name: 'Глянцеве', price: 0 },
      { name: 'Матове', price: 30 }
    ];

    for (const coating of покриттяOptions) {
      await pool.query(`
        INSERT INTO services (category_id, name, price, order_index, is_active)
        VALUES ($1, $2, $3, $4, true)
      `, [покриттяId, coating.name, coating.price, покриттяOptions.indexOf(coating) + 1]);
      console.log(`  ✓ Added: ${coating.name} - ${coating.price} zł`);
    }

    // 5. Create Інші послуги category
    const іншіResult = await pool.query(`
      INSERT INTO service_categories (name, description, order_index, is_active)
      VALUES ('Інші послуги', 'Додаткові послуги', 5, true)
      RETURNING id
    `);
    const іншіId = іншіResult.rows[0].id;
    console.log(`✅ Category "Інші послуги" created with ID: ${іншіId}`);

    const іншіServices = [
      { name: 'Гігієнічний манікюр', price: 70, description: 'Обробка нігтів без покриття' },
      { name: 'Ремонт нігтя', price: 0, description: 'Відновлення пошкодженого нігтя' }
    ];

    for (const service of іншіServices) {
      await pool.query(`
        INSERT INTO services (category_id, name, description, price, order_index, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
      `, [іншіId, service.name, service.description, service.price, іншіServices.indexOf(service) + 1]);
      console.log(`  ✓ Added: ${service.name} - ${service.price} zł`);
    }

    console.log('\n✅ Database populated successfully with all default prices!');
    console.log('📋 Created categories:');
    console.log('   1. Укріплення (7 sizes)');
    console.log('   2. Нарощення (7 sizes)');
    console.log('   3. Дизайн (4 options)');
    console.log('   4. Покриття (2 options)');
    console.log('   5. Інші послуги (2 services)');

  } catch (error) {
    console.error('❌ Error populating prices:', error);
  } finally {
    await pool.end();
  }
}

populatePrices();
