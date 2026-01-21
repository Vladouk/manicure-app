const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('manicure.db');

db.serialize(() => {
  // Insert sample promotions
  const promotions = [
    {
      name: 'Перший запис',
      description: 'Знижка 20% на перше відвідування',
      discount_type: 'percentage',
      discount_value: 20,
      is_active: 1,
      conditions: JSON.stringify({ first_time_only: true })
    },
    {
      name: 'Реферальна система',
      description: 'Приведи подругу - отримай 20% знижку на наступний манікюр, подруга отримує знижку за перший запис',
      discount_type: 'fixed',
      discount_value: 10,
      is_active: 1,
      conditions: JSON.stringify({ referral_bonus: true })
    }
  ];

  promotions.forEach(promo => {
    db.run(
      `INSERT OR IGNORE INTO promotions (name, description, discount_type, discount_value, is_active, conditions) VALUES (?, ?, ?, ?, ?, ?)`,
      [promo.name, promo.description, promo.discount_type, promo.discount_value, promo.is_active, promo.conditions],
      function(err) {
        if (err) console.error('Error inserting promotion:', err);
        else console.log('Inserted promotion:', promo.name, 'ID:', this.lastID);
      }
    );
  });
});

db.close(() => {
  console.log('Promotions populated successfully!');
});