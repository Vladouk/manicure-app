const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('manicure.db');

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function populateDB() {
  try {
    // Insert sample categories
    const categories = [
      { name: 'Гібридний манікюр (gel polish / hybryda)', description: 'Класичний гібридний манікюр' },
      { name: 'Нарощування / зміцнення гелем', description: 'Нарощування та зміцнення нігтів' },
      { name: 'Зняття, ремонт, окремі нігті', description: 'Зняття покриття та ремонт' },
      { name: 'Дизайн та декор', description: 'Декоративні послуги' }
    ];

    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      await runAsync(
        `INSERT OR IGNORE INTO service_categories (name, description, order_index, is_active) VALUES (?, ?, ?, 1)`,
        [cat.name, cat.description, i]
      );
      console.log('Inserted category:', cat.name);
    }

    // Insert sample services
    const services = [
      // Гібридний манікюр
      { category: 'Гібридний манікюр (gel polish / hybryda)', name: 'Гібридний манікюр — один колір', price: 135 },
      { category: 'Гібридний манікюр (gel polish / hybryda)', name: 'Гібридний манікюр — френч / babyboomer', price: 155 },
      { category: 'Гібридний манікюр (gel polish / hybryda)', name: 'Гібридний манікюр + вирівнювання базою', price: 155 },
      { category: 'Гібридний манікюр (gel polish / hybryda)', name: 'Зміцнення натуральної пластини', price: 145 },
      { category: 'Гібридний манікюр (gel polish / hybryda)', name: 'Міні-оновлення', price: 105 },

      // Нарощування
      { category: 'Нарощування / зміцнення гелем', name: 'Нарощування гелем — коротка довжина', price: 175 },
      { category: 'Нарощування / зміцнення гелем', name: 'Нарощування гелем — середня довжина', price: 200 },
      { category: 'Нарощування / зміцнення гелем', name: 'Нарощування гелем — довгі нігті', price: 240 },
      { category: 'Нарощування / зміцнення гелем', name: 'Нарощування гелем — френч / babyboomer / омбре', price: 250 },
      { category: 'Нарощування / зміцнення гелем', name: 'Корекція гелю — коротка довжина', price: 155 },
      { category: 'Нарощування / зміцнення гелем', name: 'Корекція гелю — середня / довга довжина', price: 175 },
      { category: 'Нарощування / зміцнення гелем', name: 'Зміцнення натуральних нігтів гелем', price: 140 },

      // Зняття
      { category: 'Зняття, ремонт, окремі нігті', name: 'Зняття гібриду без нового покриття', price: 40 },
      { category: 'Зняття, ремонт, окремі нігті', name: 'Зняття гелю / акрилу без нового покриття', price: 55 },

      // Дизайн
      { category: 'Дизайн та декор', name: 'Френч / babyboomer / омбре (на всіх нігтях)', price: 25 },
      { category: 'Дизайн та декор', name: 'Легкий дизайн (лінії, точки, 2–4 нігті)', price: 15 },
      { category: 'Дизайн та декор', name: 'Складний nail art', price: 45 },
      { category: 'Дизайн та декор', name: 'Об\'ємний дизайн / 3D', price: 50 },
      { category: 'Дизайн та декор', name: 'Ефекти (котяче око, голографік)', price: 20 },
      { category: 'Дизайн та декор', name: 'Стрази / камінці Swarovski', price: 35 },
      { category: 'Дизайн та декор', name: 'Один «багатий» ніготь', price: 15 }
    ];

    for (const service of services) {
      const categoryRow = await getAsync(`SELECT id FROM service_categories WHERE name = ?`, [service.category]);
      if (!categoryRow) {
        console.error('Category not found:', service.category);
        continue;
      }

      await runAsync(
        `INSERT OR IGNORE INTO services (category_id, name, price, order_index, is_active) VALUES (?, ?, ?, ?, 1)`,
        [categoryRow.id, service.name, service.price, 0]
      );
      console.log('Inserted service:', service.name);
    }

    console.log('Database populated successfully!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    db.close();
  }
}

populateDB();