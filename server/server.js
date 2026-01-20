const express = require('express');
const { Pool } = require('pg');
const fs = require('fs');
const crypto = require('crypto');
const TelegramBot = require('node-telegram-bot-api');
const multer = require("multer");
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_TG_IDS = [1342762796];
const ADMIN_TG_ID = ADMIN_TG_IDS[0]; // for messages

// 🔥 Telegram bot для надсилання повідомлень клієнтам
const bot = new TelegramBot(BOT_TOKEN, { polling: false });

// Set webhook
const WEBHOOK_URL = process.env.WEBHOOK_URL;
if (WEBHOOK_URL) {
  bot.setWebHook(WEBHOOK_URL);
}

// Bot commands
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, 'Привіт! Натисни кнопку, щоб записатися на манікюр:', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Записатися на манікюр 💅',
            web_app: {
              url: process.env.CLIENT_URL
            }
          }
        ]
      ]
    }
  });
});

bot.onText(/\/admin/, (msg) => {
  if (msg.from.id !== ADMIN_TG_ID) {
    bot.sendMessage(msg.chat.id, '❌ Немає доступу');
    return;
  }

  bot.sendMessage(msg.chat.id, '🔐 Адмін-панель:', {
    reply_markup: {
      inline_keyboard: [[
        {
          text: 'Відкрити адмінку 📋',
          web_app: {
            url: `${process.env.CLIENT_URL}/admin`
          }
        }
      ]]
    }
  });
});

const app = express();
app.use(express.json());
const path = require("path");


// =============== FILE UPLOADS ===============
app.use("/uploads", express.static("uploads"));
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// =============== VALIDATION (Telegram WebApp) ===============
function validateInitData(initData) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secret = crypto
    .createHmac('sha256', 'WebAppData')
    .update(BOT_TOKEN)
    .digest();

  const calculatedHash = crypto
    .createHmac('sha256', secret)
    .update(dataCheckString)
    .digest('hex');

  return calculatedHash === hash;
}

// =============== DATABASE ===============
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Create uploads directory
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

// Initialize database tables
async function initializeDatabase() {
  try {
    // Create work_slots table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS work_slots (
        id SERIAL PRIMARY KEY,
        date TEXT,
        time TEXT,
        is_booked BOOLEAN DEFAULT false
      )
    `);

    // Create appointments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        client TEXT,
        date TEXT,
        time TEXT,
        design TEXT,
        length TEXT,
        type TEXT,
        service TEXT,
        price INTEGER,
        tg_id INTEGER,
        comment TEXT,
        status TEXT DEFAULT 'pending',
        reference_image TEXT,
        reminded BOOLEAN DEFAULT false
      )
    `);

    // Create reminders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        appointment_id INTEGER UNIQUE,
        notified BOOLEAN DEFAULT false
      )
    `);

    // Create client_points table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS client_points (
        tg_id INTEGER PRIMARY KEY,
        points INTEGER DEFAULT 0,
        referral_discount_available BOOLEAN DEFAULT false
      )
    `);

    // Create service_categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        order_index INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true
      )
    `);

    // Create services table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        category_id INTEGER,
        name TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        is_promotion BOOLEAN DEFAULT false,
        discount_price INTEGER,
        order_index INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        FOREIGN KEY (category_id) REFERENCES service_categories(id)
      )
    `);

    // Create promotions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS promotions (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        discount_type TEXT,
        discount_value INTEGER,
        is_active BOOLEAN DEFAULT true,
        valid_from TIMESTAMP,
        valid_until TIMESTAMP,
        conditions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create referral_codes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referral_codes (
        id SERIAL PRIMARY KEY,
        tg_id INTEGER NOT NULL,
        code TEXT UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used_count INTEGER DEFAULT 0
      )
    `);

    // Create referral_uses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referral_uses (
        id SERIAL PRIMARY KEY,
        referral_code_id INTEGER,
        used_by_tg_id INTEGER,
        appointment_id INTEGER,
        discount_applied INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (referral_code_id) REFERENCES referral_codes(id),
        FOREIGN KEY (appointment_id) REFERENCES appointments(id)
      )
    `);

    console.log('Database tables initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

// Run database initialization
initializeDatabase().then(() => {
  populateDatabase();
}).catch(error => {
  console.error('Error initializing database:', error);
});

// Populate database with initial data
async function populateDatabase() {
  try {
    const result = await pool.query(`SELECT COUNT(*) as count FROM service_categories`);
    console.log('Service categories count:', result.rows[0].count);
    if (parseInt(result.rows[0].count) === 0) {
      console.log('Database empty, populating categories and services...');
      // Insert categories
      const categories = [
        { name: 'Гібридний манікюр (gel polish / hybryda)', description: 'Класичний гібридний манікюр' },
        { name: 'Нарощування / зміцнення гелем', description: 'Нарощування та зміцнення нігтів' },
        { name: 'Зняття, ремонт, окремі нігті', description: 'Зняття покриття та ремонт' },
        { name: 'Дизайн та декор', description: 'Декоративні послуги' }
      ];

      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        await pool.query(
          `INSERT INTO service_categories (name, description, order_index, is_active) VALUES ($1, $2, $3, true) ON CONFLICT DO NOTHING`,
          [cat.name, cat.description, i]
        );
      }

      // Add some services
      const services = [
        { category: 'Гібридний манікюр (gel polish / hybryda)', name: 'Гібридний манікюр — один колір', price: 135 },
        { category: 'Гібридний манікюр (gel polish / hybryda)', name: 'Гібридний манікюр — френч / babyboomer', price: 155 },
        { category: 'Гібридний манікюр (gel polish / hybryda)', name: 'Гібридний манікюр + вирівнювання базою', price: 155 },
        { category: 'Нарощування / зміцнення гелем', name: 'Нарощування гелем', price: 200 },
        { category: 'Зняття, ремонт, окремі нігті', name: 'Зняття гелю', price: 50 },
        { category: 'Дизайн та декор', name: 'Дизайн нігтів', price: 30 }
      ];

      for (let i = 0; i < services.length; i++) {
        const service = services[i];
        const catResult = await pool.query(`SELECT id FROM service_categories WHERE name = $1`, [service.category]);
        if (catResult.rows.length > 0) {
          const catId = catResult.rows[0].id;
          await pool.query(
            `INSERT INTO services (category_id, name, price, is_active) VALUES ($1, $2, $3, true) ON CONFLICT DO NOTHING`,
            [catId, service.name, service.price]
          );
        }
      }
    }

    // Always add some future slots
    console.log('Adding future work slots...');
    const now = new Date();
    for (let i = 1; i <= 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const times = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
      for (let j = 0; j < times.length; j++) {
        const time = times[j];
        await pool.query(`INSERT INTO work_slots (date, time) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [dateStr, time]);
      }
    }

    console.log('Database populated.');
  } catch (error) {
    console.error('Error populating database:', error);
  }
}

// ============== CLIENT: CREATE APPOINTMENT ===============
app.post(
  "/api/appointment",
  upload.single("reference"),
  (req, res) => {
    console.log("Received appointment data:", req.body);
    const { client, slot_id, design, length, type, service, price, comment, tg_id, username, referral_code } = req.body;
    const referenceImage = req.file ? `/uploads/${req.file.filename}` : null;

    if (!client || !slot_id || !tg_id) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // Check if first-time client for 20% discount
    pool.query(`SELECT COUNT(*) as count FROM appointments WHERE tg_id = $1 AND status != 'canceled'`, [tg_id])
      .then(result => {
        const firstTimeRow = result.rows[0];
        let finalPrice = price;
        let discountApplied = 0;
        let referralInfo = null;

        // Apply first-time discount (20%)
        if (firstTimeRow.count === 0) {
          discountApplied = Math.round(price * 0.2);
          finalPrice = price - discountApplied;
        }

        // Check for referral discount available
        return pool.query(`SELECT referral_discount_available FROM client_points WHERE tg_id = $1`, [tg_id])
          .then(result => {
            const referralRow = result.rows[0];
            if (referralRow && referralRow.referral_discount_available) {
              const referralDiscount = Math.round(price * 0.2);
              finalPrice = finalPrice - referralDiscount;
              discountApplied += referralDiscount;
              pool.query(`UPDATE client_points SET referral_discount_available = 0 WHERE tg_id = $1`, [tg_id])
                .catch(err => console.error('Error resetting referral discount:', err));
            }

            // Handle referral code if provided
            if (referral_code) {
              return pool.query(`SELECT id, tg_id as referrer_tg_id FROM referral_codes WHERE code = $1 AND is_active = true`, [referral_code])
                .then(result => {
                  const codeRow = result.rows[0];
                  if (codeRow) {
                    // Check if user already used this referral code
                    return pool.query(`SELECT id FROM referral_uses WHERE referral_code_id = $1 AND used_by_tg_id = $2`, [codeRow.id, tg_id])
                      .then(result => {
                        const useRow = result.rows[0];
                        if (!useRow) {
                          // Give referral discount to the referrer
                          pool.query(`UPDATE client_points SET referral_discount_available = 1 WHERE tg_id = $1`, [codeRow.referrer_tg_id])
                            .catch(err => console.error('Error updating referral discount:', err));

                          // Record the referral use
                          pool.query(`INSERT INTO referral_uses (referral_code_id, used_by_tg_id, discount_applied) VALUES ($1, $2, 0)`, [codeRow.id, tg_id])
                            .catch(err => console.error('Error inserting referral use:', err));

                          referralInfo = {
                            code_id: codeRow.id,
                            referrer_tg_id: codeRow.referrer_tg_id,
                            discount_available: true
                          };
                        }

                        return createAppointment(finalPrice, discountApplied, referralInfo);
                      });
                  } else {
                    return createAppointment(finalPrice, discountApplied, referralInfo);
                  }
                });
            } else {
              return createAppointment(finalPrice, discountApplied, referralInfo);
            }
          });
      })
      .catch(err => res.status(500).json({ error: "DB error" }));

    function createAppointment(finalPrice, discountApplied, referralInfo) {
      // Check slot availability
      pool.query(`SELECT date, time FROM work_slots WHERE id = $1 AND is_booked = false`, [slot_id])
        .then(result => {
          const slot = result.rows[0];
          if (!slot) {
            return res.status(400).json({ error: "Slot not available" });
          }

          // Insert appointment
          return pool.query(
            `INSERT INTO appointments 
            (client, date, time, design, length, type, service, price, comment, reference_image, tg_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id`,
            [
              client,
              slot.date,
              slot.time,
              design,
              length,
              type,
              service,
              finalPrice,
              comment,
              referenceImage,
              tg_id
            ]
          )
          .then(result => {
            const appointmentId = result.rows[0].id;
            console.log("Appointment inserted with id", appointmentId);

            // Insert reminder
            pool.query(`INSERT INTO reminders (appointment_id) VALUES ($1)`, [appointmentId])
              .catch(err => console.error("Reminder insert error:", err));

            // Handle referral use
            if (referralInfo) {
              pool.query(
                `INSERT INTO referral_uses (referral_code_id, used_by_tg_id, appointment_id, discount_applied) VALUES ($1, $2, $3, $4)`,
                [referralInfo.code_id, tg_id, appointmentId, 0],  // Assuming discount_applied is 0 for now
                (err) => {
                  if (!err) {
                    // Update referral code usage count
                    pool.query(`UPDATE referral_codes SET used_count = used_count + 1 WHERE id = $1`, [referralInfo.code_id])
                      .catch(err => console.error("Referral code update error:", err));

                    // Give referrer 10zl bonus (add to points or notify)
                    // For now, we'll just log it - can be extended to add points
                    console.log(`Referral bonus: ${referralInfo.referrer_tg_id} gets 10zl for referring ${tg_id}`);
                  }
                }
              )
              .catch(err => console.error("Referral use insert error:", err));
            }

            // Update slot as booked
            pool.query(`UPDATE work_slots SET is_booked = true WHERE id = $1`, [slot_id])
              .catch(err => console.error("Slot update error:", err));

            // 🔔 Сповіщення клієнту
            let clientMessage = `💅 *Запис створено!*  

📅 Дата: ${slot.date}  
⏰ Час: ${slot.time}  

🎨 Дизайн: ${design}  
📏 Довжина: ${length}  
💎 Тип: ${type}  
💼 Послуга: ${service}  

💰 Ціна: ${finalPrice} zł`;

            if (discountApplied > 0) {
              clientMessage += `\n💸 Знижка: ${discountApplied} zł`;
            }

            if (referralInfo) {
              clientMessage += `\n🎉 Використано реферальний код!`;
            }

            clientMessage += `\n\n⏳ *Статус:* очікує підтвердження`;

            bot.sendMessage(
              tg_id,
              clientMessage,
              { parse_mode: "Markdown" }
            );

            // 🔥 Сповіщення адміну — РОЗШИРЕНА ВЕРСІЯ
            let adminMessage = `🔔 *Новий запис!*

👤 Клієнт: [${client}](tg://user?id=${tg_id})

📅 Дата: *${slot.date}*
⏰ Час: *${slot.time}*

🎨 Дизайн: *${design}*
📏 Довжина: *${length}*
💎 Тип: *${type}*
💼 Послуга: *${service}*
💰 Ціна: *${finalPrice} zł*`;

            if (discountApplied > 0) {
              adminMessage += `\n💸 Знижка: *${discountApplied} zł*`;
            }

            if (referralInfo) {
              adminMessage += `\n🎉 *Рефералка від користувача ${referralInfo.referrer_tg_id}*`;
            }

            if (comment && comment.trim() !== "") {
              adminMessage += `\n💬 *Коментар клієнта:*\n${comment}`;
            }

            bot.sendMessage(
              ADMIN_TG_ID,
              adminMessage,
              { parse_mode: "Markdown" }
            );

            res.json({ ok: true, appointment_id: appointmentId, final_price: finalPrice, discount: discountApplied });
          });
        })
        .catch(err => {
          console.error("DB error in createAppointment:", err);
          res.status(500).json({ error: "DB error" });
        });
    }
  }
);
        app.get('/api/appointment/my', (req, res) => {
          const tg_id = req.query.tg_id;

          if (!tg_id) {
            return res.status(400).json({ error: "Missing tg_id" });
          }

          pool.query(`
    SELECT id, date, time, design, length, type, status, comment
    FROM appointments
    WHERE tg_id = $1
      AND status != 'canceled'
    ORDER BY date DESC, time DESC
    LIMIT 1
    `, [tg_id])
            .then(result => {
              const row = result.rows[0];
              console.log("📌 MY APPOINTMENT:", row);
              res.json(row || null);
            })
            .catch(err => {
              console.error("DB ERROR:", err);
              res.status(500).json({ error: "DB error" });
            });
        });

        // ============== CLIENT CANCEL APPOINTMENT1 ===============
        app.post('/api/appointment/cancel', (req, res) => {
          const { tg_id } = req.body;

          if (!tg_id) return res.status(400).json({ error: "Missing tg_id" });

          pool.query(
            `SELECT id, date, time, design, length, comment, type FROM appointments WHERE tg_id = $1 AND status != 'canceled'`,
            [tg_id]
          )
          .then(result => {
            const row = result.rows[0];
            if (!row)
              return res.status(400).json({ error: "No active appointment" });

            // 1️⃣ Позначаємо запис як скасований
            pool.query(`UPDATE appointments SET status='canceled' WHERE id = $1`, [row.id])
              .catch(err => console.error("Cancel appointment error:", err));

            // 2️⃣ Звільняємо слот
            pool.query(`UPDATE work_slots SET is_booked = false WHERE date = $1 AND time = $2`, [row.date, row.time])
              .catch(err => console.error("Free slot error:", err));

            // 3️⃣ Повідомляємо клієнту
            bot.sendMessage(
              tg_id,
              `❌ *Ваш запис скасовано!*

📅 ${row.date}
⏰ ${row.time}`
              , { parse_mode: "Markdown" }
            );

            // 4️⃣ Повідомляємо адміну
            bot.sendMessage(
              ADMIN_TG_ID,
              `❗ *Клієнт сам скасував запис*  

👤 [Клієнт](tg://user?id=${tg_id})  
📅 ${row.date}  
⏰ ${row.time}

🎨 ${row.design}
📏 ${row.length}
💅 ${row.type}
`, { parse_mode: "Markdown" }
            );

            return res.json({ ok: true });
          })
          .catch(err => res.status(500).json({ error: "DB error" }));
        });

        // =============== CLIENT: GET BONUS POINTS ===============
        app.get('/api/client/points', (req, res) => {
          const tg_id = req.query.tg_id;

          if (!tg_id) return res.status(400).json({ error: "Missing tg_id" });

          pool.query(`SELECT points FROM client_points WHERE tg_id = $1`, [tg_id])
            .then(result => {
              const row = result.rows[0];
              res.json({ points: row ? row.points : 0 });
            })
            .catch(err => res.status(500).json({ error: "DB error" }));
        });

        // =============== CLIENT: SPEND BONUS POINTS ===============
        app.post('/api/client/spend-points', (req, res) => {
          const { tg_id, points_to_spend } = req.body;

          if (!tg_id || !points_to_spend) return res.status(400).json({ error: "Missing tg_id or points_to_spend" });

          pool.query(`SELECT points FROM client_points WHERE tg_id = $1`, [tg_id])
            .then(result => {
              const row = result.rows[0];
              const currentPoints = row ? row.points : 0;
              if (currentPoints < points_to_spend) return res.status(400).json({ error: "Not enough points" });

              return pool.query(`UPDATE client_points SET points = points - $1 WHERE tg_id = $2`, [points_to_spend, tg_id])
                .then(() => {
                  // Відправити повідомлення клієнту
                  let rewardText = "";
                  if (points_to_spend === 10) rewardText = "Безкоштовний дизайн активовано! 🎨";
                  else if (points_to_spend === 20) rewardText = "Знижка 30% активована! 💰";
                  else if (points_to_spend === 30) rewardText = "Повний манікюр безкоштовно активовано! 💅";

                  bot.sendMessage(tg_id, `🎁 *Винагорода активована!*\n\n${rewardText}`, { parse_mode: "Markdown" });

                  // Повідомити адміна
                  bot.sendMessage(ADMIN_TG_ID, `🎁 Клієнт витратив ${points_to_spend} балів на винагороду: ${rewardText}`, { parse_mode: "Markdown" });

                  res.json({ ok: true });
                });
            })
            .catch(err => res.status(500).json({ error: "DB error" }));
        });

        // =============== ADMIN: GET ALL APPOINTMENTS ===============
        app.get('/api/admin/appointments', (req, res) => {
          const initData = req.headers['x-init-data'];
          const status = req.query.status; // 👈 беремо статус з query

          if (!initData || !validateInitData(initData))
            return res.status(403).json({ error: 'Access denied' });

          const user = JSON.parse(new URLSearchParams(initData).get('user'));
          if (!ADMIN_TG_IDS.includes(user.id))
            return res.status(403).json({ error: 'Not admin' });

          let sql = 'SELECT * FROM appointments';
          let params = [];

          if (status && status !== 'all') {
            sql += ' WHERE status = $1';
            params.push(status);
          }

          sql += `
  ORDER BY 
    date ASC, time ASC
`;

          pool.query(sql, params)
            .then(result => res.json(result.rows))
            .catch(err => res.status(500).json({ error: "DB error" }));
        });

        // ====== ADMIN: APPROVE ======
        app.post('/api/admin/status', (req, res) => {
          const { id, status } = req.body;
          const initData = req.headers['x-init-data'];

          if (!initData || !validateInitData(initData))
            return res.status(403).json({ error: 'Access denied' });

          const user = JSON.parse(new URLSearchParams(initData).get('user'));
          if (!ADMIN_TG_IDS.includes(user.id))
            return res.status(403).json({ error: 'Not admin' });

          pool.query(`SELECT date, time, tg_id FROM appointments WHERE id = $1`, [id])
            .then(result => {
              const row = result.rows[0];
              if (!row) return res.json({ ok: true });

              pool.query(`UPDATE appointments SET status = $1 WHERE id = $2`, [status, id])
                .catch(err => console.error("Status update error:", err));
              let text = "";

              if (status === "approved") {
                text = `✅ *Ваш запис підтверджено!*

📅 ${row.date}
⏰ ${row.time}

Чекаю вас 💖`;
              }

              if (status === "canceled") {
                text = `❌ *Ваш запис скасовано*

📅 ${row.date}
⏰ ${row.time}

Якщо хочете — можете записатись знову`;
              }

              if (text) {
                bot.sendMessage(row.tg_id, text, { parse_mode: "Markdown" });
              }

              // Додати бали за підтверджений запис
              if (status === "approved") {
                pool.query(`INSERT INTO client_points (tg_id, points) VALUES ($1, 0) ON CONFLICT (tg_id) DO NOTHING`, [row.tg_id])
                  .then(() => pool.query(`UPDATE client_points SET points = points + 1 WHERE tg_id = $1`, [row.tg_id]))
                  .catch(err => console.error("Points update error:", err));
              }


              // ❗ якщо скасовано — розблокувати слот
              if (status === 'canceled') {
                pool.query(`UPDATE work_slots SET is_booked = false WHERE date = $1 AND time = $2`, [row.date, row.time])
                  .catch(err => console.error("Slot unbook error:", err));
              }

              res.json({ ok: true });
            })
            .catch(err => res.status(500).json({ error: "DB error" }));
        });
        // =============== CLIENT: GET AVAILABLE SLOTS ===============
        app.get('/api/slots', (req, res) => {
          pool.query(`SELECT id, date, time, is_booked FROM work_slots ORDER BY date, time`, [])
            .then(result => {
              const rows = result.rows;
              const now = new Date();

              const filtered = rows.filter(slot => {
                const slotDate = new Date(`${slot.date}T${slot.time}:00`);
                const diffMs = slotDate - now;
                const diffMinutes = diffMs / 1000 / 60;

                return (
                  diffMinutes >= 30 &&   // ❗ показуємо лише якщо до слота ≥ 30 хв
                  slot.is_booked === false   // ❗ слот не зайнятий
                );
              });

              res.json(filtered);
            })
            .catch(err => res.status(500).json({ error: "DB error" }));
        });

        // =============== ADMIN: GET ALL CLIENTS ===============
        app.get('/api/admin/clients', (req, res) => {
          const initData = req.headers['x-init-data'];

          if (!initData || !validateInitData(initData))
            return res.status(403).json({ error: 'Access denied' });

          const user = JSON.parse(new URLSearchParams(initData).get('user'));
          if (!ADMIN_TG_IDS.includes(user.id))
            return res.status(403).json({ error: 'Not admin' });

          pool.query(
            `
    SELECT 
      tg_id,
      client,
      MAX(date || ' ' || time) AS last_visit
    FROM appointments
    GROUP BY tg_id, client
    ORDER BY last_visit DESC
    `,
            []
          )
            .then(result => res.json(result.rows))
            .catch(err => res.status(500).json({ error: "DB error" }));
        });
        // =============== ADMIN: GET CLIENT HISTORY ===============
        app.get('/api/admin/client-history', (req, res) => {
          const initData = req.headers['x-init-data'];
          const tg_id = req.query.tg_id;

          if (!tg_id) return res.status(400).json({ error: "Missing tg_id" });

          if (!initData || !validateInitData(initData))
            return res.status(403).json({ error: 'Access denied' });

          const user = JSON.parse(new URLSearchParams(initData).get('user'));
          if (!ADMIN_TG_IDS.includes(user.id))
            return res.status(403).json({ error: 'Not admin' });

          pool.query(`
    SELECT 
      id, date, time, design, length, type, status, comment
    FROM appointments
    WHERE tg_id = $1
    ORDER BY date DESC, time DESC
    `, [tg_id])
            .then(result => res.json(result.rows))
            .catch(err => res.status(500).json({ error: "DB error" }));
        });
        // =============== ADMIN: GET ALL WORK SLOTS ===============
        app.get('/api/admin/slots', (req, res) => {
          const initData = req.headers['x-init-data'];

          if (!initData || !validateInitData(initData))
            return res.status(403).json({ error: 'Access denied' });

          const user = JSON.parse(new URLSearchParams(initData).get('user'));
          if (!ADMIN_TG_IDS.includes(user.id))
            return res.status(403).json({ error: 'Not admin' });

          pool.query(`
    SELECT
  ws.id,
  ws.date,
  ws.time,
  ws.is_booked,
  a.client AS client_name,
  a.username AS client_username
FROM work_slots ws
LEFT JOIN appointments a
  ON ws.date = a.date AND ws.time = a.time AND a.status != 'canceled'
ORDER BY ws.date, ws.time
    `, [])
            .then(result => {
              console.log('Admin slots query returned:', result.rows.length, 'slots');
              res.json(result.rows);
            })
            .catch(err => {
              console.error('Error getting admin slots:', err);
              res.status(500).json({ error: "DB error" });
            });
        });


        // ====== ADD WORK SLOT ======
        app.post('/api/admin/add-slot', (req, res) => {
          const { date, time } = req.body;
          console.log('Adding slot:', { date, time });
          const initData = req.headers['x-init-data'];

          if (!initData || !validateInitData(initData))
            return res.status(403).json({ error: 'Access denied' });

          const user = JSON.parse(new URLSearchParams(initData).get('user'));
          if (!ADMIN_TG_IDS.includes(user.id))
            return res.status(403).json({ error: 'Not admin' });

          pool.query(`INSERT INTO work_slots (date, time) VALUES ($1, $2) RETURNING id`, [date, time])
            .then(result => {
              console.log('Slot added successfully:', result.rows[0]);
              res.json({ ok: true, id: result.rows[0].id });
            })
            .catch(err => {
              console.error('Error adding slot:', err);
              res.status(500).json({ error: 'DB error' });
            });
        });
        // ====== DELETE WORK SLOT ======
        app.post('/api/admin/delete-slot', (req, res) => {
          const { id } = req.body;
          const initData = req.headers['x-init-data'];

          if (!initData || !validateInitData(initData))
            return res.status(403).json({ error: 'Access denied' });

          const user = JSON.parse(new URLSearchParams(initData).get('user'));
          if (!ADMIN_TG_IDS.includes(user.id))
            return res.status(403).json({ error: 'Not admin' });

          pool.query(`DELETE FROM work_slots WHERE id = $1 AND is_booked = false`, [id])
            .then(() => res.json({ ok: true }))
            .catch(err => res.status(500).json({ error: 'DB error' }));
        });

        // =============== ADMIN: DELETE APPOINTMENT ===============
        app.post('/api/admin/delete', (req, res) => {
          const { id } = req.body;
          const initData = req.headers['x-init-data'];

          if (!initData || !validateInitData(initData))
            return res.status(403).json({ error: 'Access denied' });

          const user = JSON.parse(new URLSearchParams(initData).get('user'));
          if (!ADMIN_TG_IDS.includes(user.id))
            return res.status(403).json({ error: 'Not admin' });

          // 1️⃣ беремо дату і час запису
          pool.query(`SELECT date, time, tg_id FROM appointments WHERE id = $1`, [id])
            .then(result => {
              const row = result.rows[0];
              if (!row) return res.json({ ok: true });

              // 2️⃣ видаляємо запис
              pool.query(`DELETE FROM appointments WHERE id = $1`, [id])
                .catch(err => console.error("Delete appointment error:", err));

              // 3️⃣ розблоковуємо слот
              pool.query(`UPDATE work_slots SET is_booked = false WHERE date = $1 AND time = $2`, [row.date, row.time])
                .catch(err => console.error("Unbook slot error:", err));

              bot.sendMessage(
                row.tg_id,
                `🗑 *Ваш запис було видалено адміністратором*

📅 ${row.date}
⏰ ${row.time}

Буду рада новому запису 💅`,
                { parse_mode: "Markdown" }
              );

              res.json({ ok: true });
            })
            .catch(err => res.status(500).json({ error: "DB error" }));
        });

        // =============== PRICE LIST MANAGEMENT ===============

        // Get all categories and services
        app.get('/api/admin/prices', (req, res) => {
          const initData = req.headers['x-init-data'];

          if (!initData || !validateInitData(initData))
            return res.status(403).json({ error: 'Access denied' });

          const user = JSON.parse(new URLSearchParams(initData).get('user'));
          if (!ADMIN_TG_IDS.includes(user.id))
            return res.status(403).json({ error: 'Not admin' });

          pool.query(`
    SELECT 
      c.id as category_id,
      c.name as category_name,
      c.description as category_description,
      c.order_index as category_order,
      c.is_active as category_active,
      s.id as service_id,
      s.name as service_name,
      s.description as service_description,
      s.price,
      s.is_promotion,
      s.discount_price,
      s.order_index as service_order,
      s.is_active as service_active
    FROM service_categories c
    LEFT JOIN services s ON c.id = s.category_id
    WHERE c.is_active = true
    ORDER BY c.order_index, c.id, s.order_index, s.id
  `, [])
            .then(result => {
              const rows = result.rows;

              // Group by categories
              const categories = {};
              rows.forEach(row => {
                if (!categories[row.category_id]) {
                  categories[row.category_id] = {
                    id: row.category_id,
                    name: row.category_name,
                    description: row.category_description,
                    order_index: row.category_order,
                    is_active: row.category_active,
                    services: []
                  };
                }
                if (row.service_id) {
                  categories[row.category_id].services.push({
                    id: row.service_id,
                    name: row.service_name,
                    description: row.service_description,
                    price: row.price,
                    is_promotion: row.is_promotion,
                    discount_price: row.discount_price,
                    order_index: row.service_order,
                    is_active: row.service_active
                  });
                }
              });

              res.json(Object.values(categories));
            })
            .catch(err => res.status(500).json({ error: 'DB error' }));
        });

        // Add/Edit category
        app.post('/api/admin/category', (req, res) => {
          const { id, name, description, order_index, is_active } = req.body;
          const initData = req.headers['x-init-data'];

          if (!initData || !validateInitData(initData))
            return res.status(403).json({ error: 'Access denied' });

          const user = JSON.parse(new URLSearchParams(initData).get('user'));
          if (!ADMIN_TG_IDS.includes(user.id))
            return res.status(403).json({ error: 'Not admin' });

          if (id) {
            // Update
            pool.query(
              `UPDATE service_categories SET name = $1, description = $2, order_index = $3, is_active = $4 WHERE id = $5`,
              [name, description, order_index || 0, is_active, id]
            )
              .then(() => res.json({ id: id }))
              .catch(err => res.status(500).json({ error: 'DB error' }));
          } else {
            // Insert
            pool.query(
              `INSERT INTO service_categories (name, description, order_index, is_active) VALUES ($1, $2, $3, $4) RETURNING id`,
              [name, description, order_index || 0, is_active]
            )
              .then(result => res.json({ id: result.rows[0].id }))
              .catch(err => res.status(500).json({ error: 'DB error' }));
          }
        });

        // Delete category
        app.delete('/api/admin/category/:id', (req, res) => {
          const categoryId = req.params.id;
          const initData = req.headers['x-init-data'];

          if (!initData || !validateInitData(initData))
            return res.status(403).json({ error: 'Access denied' });

          const user = JSON.parse(new URLSearchParams(initData).get('user'));
          if (!ADMIN_TG_IDS.includes(user.id))
            return res.status(403).json({ error: 'Not admin' });

          // First delete all services in this category
          pool.query(`DELETE FROM services WHERE category_id = $1`, [categoryId])
            .then(() => {
              // Then delete the category
              return pool.query(`DELETE FROM service_categories WHERE id = $1`, [categoryId]);
            })
            .then(() => res.json({ ok: true }))
            .catch(err => res.status(500).json({ error: 'DB error' }));
        });

        // Add/Edit service
        app.post('/api/admin/service', (req, res) => {
          const { id, category_id, name, description, price, is_promotion, discount_price, order_index, is_active } = req.body;
          const initData = req.headers['x-init-data'];

          if (!initData || !validateInitData(initData))
            return res.status(403).json({ error: 'Access denied' });

          const user = JSON.parse(new URLSearchParams(initData).get('user'));
          if (!ADMIN_TG_IDS.includes(user.id))
            return res.status(403).json({ error: 'Not admin' });

          if (id) {
            // Update
            pool.query(
              `UPDATE services SET category_id = $1, name = $2, description = $3, price = $4, is_promotion = $5, discount_price = $6, order_index = $7, is_active = $8 WHERE id = $9`,
              [category_id, name, description, price, is_promotion, discount_price, order_index || 0, is_active, id]
            )
              .then(() => res.json({ id: id }))
              .catch(err => res.status(500).json({ error: 'DB error' }));
          } else {
            // Insert
            pool.query(
              `INSERT INTO services (category_id, name, description, price, is_promotion, discount_price, order_index, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
              [category_id, name, description, price, is_promotion, discount_price, order_index || 0, is_active]
            )
              .then(result => res.json({ id: result.rows[0].id }))
              .catch(err => res.status(500).json({ error: 'DB error' }));
          }
        });

        // Delete service
        app.delete('/api/admin/service/:id', (req, res) => {
          const serviceId = req.params.id;
          const initData = req.headers['x-init-data'];

          if (!initData || !validateInitData(initData))
            return res.status(403).json({ error: 'Access denied' });

          const user = JSON.parse(new URLSearchParams(initData).get('user'));
          if (!ADMIN_TG_IDS.includes(user.id))
            return res.status(403).json({ error: 'Not admin' });

          pool.query(`DELETE FROM services WHERE id = $1`, [serviceId])
            .then(() => res.json({ ok: true }))
            .catch(err => res.status(500).json({ error: 'DB error' }));
        });

        // Get prices for client booking
        app.get('/api/prices', (req, res) => {
          pool.query(`
    SELECT 
      c.id as category_id,
      c.name as category_name,
      c.description as category_description,
      s.id as service_id,
      s.name as service_name,
      s.description as service_description,
      s.price,
      s.is_promotion,
      s.discount_price
    FROM service_categories c
    LEFT JOIN services s ON c.id = s.category_id
    WHERE c.is_active = true AND (s.is_active = true OR s.id IS NULL)
    ORDER BY c.order_index, c.id, s.order_index, s.id
  `, [])
            .then(result => {
              const rows = result.rows;

              // Group by categories
              const categories = {};
              rows.forEach(row => {
                if (!categories[row.category_id]) {
                  categories[row.category_id] = {
                    id: row.category_id,
                    name: row.category_name,
                    description: row.category_description,
                    services: []
                  };
                }
                if (row.service_id) {
                  categories[row.category_id].services.push({
                    id: row.service_id,
                    name: row.service_name,
                    description: row.service_description,
                    price: row.price,
                    is_promotion: row.is_promotion,
                    discount_price: row.discount_price
                  });
                }
              });

              res.json(Object.values(categories));
            })
            .catch(err => res.status(500).json({ error: 'DB error' }));
        });

        // =============== PROMOTIONS AND REFERRALS MANAGEMENT ===============

        // Get all promotions
        app.get('/api/admin/promotions', (req, res) => {
          const initData = req.headers['x-init-data'];

          if (!initData || !validateInitData(initData))
            return res.status(403).json({ error: 'Access denied' });

          const user = JSON.parse(new URLSearchParams(initData).get('user'));
          if (!ADMIN_TG_IDS.includes(user.id))
            return res.status(403).json({ error: 'Not admin' });

          pool.query(`
    SELECT id, name, description, discount_type, discount_value, is_active, valid_from, valid_until, conditions, created_at
    FROM promotions
    ORDER BY created_at DESC
  `, [])
            .then(result => res.json(result.rows))
            .catch(err => res.status(500).json({ error: 'DB error' }));
        });

        // Add/Edit promotion
        app.post('/api/admin/promotion', (req, res) => {
          const { id, name, description, discount_type, discount_value, is_active, valid_from, valid_until, conditions } = req.body;
          const initData = req.headers['x-init-data'];

          if (!initData || !validateInitData(initData))
            return res.status(403).json({ error: 'Access denied' });

          const user = JSON.parse(new URLSearchParams(initData).get('user'));
          if (!ADMIN_TG_IDS.includes(user.id))
            return res.status(403).json({ error: 'Not admin' });

          if (id) {
            // Update
            pool.query(
              `UPDATE promotions SET name = $1, description = $2, discount_type = $3, discount_value = $4, is_active = $5, valid_from = $6, valid_until = $7, conditions = $8 WHERE id = $9`,
              [name, description, discount_type, discount_value, is_active, valid_from, valid_until, conditions, id]
            )
              .then(() => res.json({ id: id }))
              .catch(err => res.status(500).json({ error: 'DB error' }));
          } else {
            // Insert
            pool.query(
              `INSERT INTO promotions (name, description, discount_type, discount_value, is_active, valid_from, valid_until, conditions) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
              [name, description, discount_type, discount_value, is_active, valid_from, valid_until, conditions]
            )
              .then(result => res.json({ id: result.rows[0].id }))
              .catch(err => res.status(500).json({ error: 'DB error' }));
          }
        });

        // Delete promotion
        app.delete('/api/admin/promotion/:id', (req, res) => {
          const promotionId = req.params.id;
          const initData = req.headers['x-init-data'];

          if (!initData || !validateInitData(initData))
            return res.status(403).json({ error: 'Access denied' });

          const user = JSON.parse(new URLSearchParams(initData).get('user'));
          if (!ADMIN_TG_IDS.includes(user.id))
            return res.status(403).json({ error: 'Not admin' });

          pool.query(`DELETE FROM promotions WHERE id = $1`, [promotionId])
            .then(() => res.json({ ok: true }))
            .catch(err => res.status(500).json({ error: 'DB error' }));
        });

        // Get user's referral code
        app.get('/api/referral/code', (req, res) => {
          const tg_id = req.query.tg_id;

          if (!tg_id) return res.status(400).json({ error: "Missing tg_id" });

          // Check if user already has a referral code
          pool.query(`SELECT id, code, used_count FROM referral_codes WHERE tg_id = $1 AND is_active = true`, [tg_id])
            .then(result => {
              const row = result.rows[0];
              if (row) {
                res.json({ code: row.code, used_count: row.used_count });
              } else {
                // Generate new referral code
                const crypto = require('crypto');
                const code = crypto.randomBytes(4).toString('hex').toUpperCase();

                return pool.query(`INSERT INTO referral_codes (tg_id, code) VALUES ($1, $2)`, [tg_id, code])
                  .then(() => res.json({ code: code, used_count: 0 }));
              }
            })
            .catch(err => res.status(500).json({ error: 'DB error' }));
        });

        // Apply referral code
        app.post('/api/referral/apply', (req, res) => {
          const { referral_code, tg_id, appointment_price } = req.body;

          if (!referral_code || !tg_id || !appointment_price) {
            return res.status(400).json({ error: "Missing required fields" });
          }

          // Check if referral code exists and is active
          pool.query(`SELECT id, tg_id as referrer_tg_id FROM referral_codes WHERE code = $1 AND is_active = true`, [referral_code])
            .then(result => {
              const codeRow = result.rows[0];
              if (!codeRow) return res.status(400).json({ error: "Invalid referral code" });

              // Check if user already used this referral code
              return pool.query(`SELECT id FROM referral_uses WHERE referral_code_id = $1 AND used_by_tg_id = $2`, [codeRow.id, tg_id])
                .then(result => {
                  const useRow = result.rows[0];
                  if (useRow) return res.status(400).json({ error: "Referral code already used" });

                  // Calculate discount for referee (30% off first booking)
                  const refereeDiscount = Math.round(appointment_price * 0.3);

                  res.json({
                    valid: true,
                    referee_discount: refereeDiscount,
                    referrer_bonus: 10, // 10zl bonus for referrer
                    referrer_tg_id: codeRow.referrer_tg_id
                  });
                });
            })
            .catch(err => res.status(500).json({ error: 'DB error' }));
        });

        // Get active promotions for client
        app.get('/api/promotions', (req, res) => {
          const now = new Date().toISOString();

          pool.query(`
    SELECT id, name, description, discount_type, discount_value, conditions
    FROM promotions
    WHERE is_active = true
    AND (valid_from IS NULL OR valid_from <= $1)
    AND (valid_until IS NULL OR valid_until >= $1)
    ORDER BY created_at DESC
  `, [now])
            .then(result => res.json(result.rows))
            .catch(err => res.status(500).json({ error: 'DB error' }));
        });

        // Check if user is first-time client
        app.get('/api/client/first-time', (req, res) => {
          const tg_id = req.query.tg_id;

          if (!tg_id) return res.status(400).json({ error: "Missing tg_id" });

          pool.query(`SELECT COUNT(*) as count FROM appointments WHERE tg_id = $1 AND status != 'canceled'`, [tg_id])
            .then(result => {
              const row = result.rows[0];
              res.json({ is_first_time: row.count === 0 });
            })
            .catch(err => res.status(500).json({ error: 'DB error' }));
        });

        const cron = require('node-cron');

        // =============== DAILY REMINDERS (18:00) ===============
        cron.schedule('0 18 * * *', () => {
          console.log("⏰ Запускаю нагадування...");

          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);

          const yyyy = tomorrow.getFullYear();
          const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
          const dd = String(tomorrow.getDate()).padStart(2, '0');
          const targetDate = `${yyyy}-${mm}-${dd}`;

          pool.query(
            `SELECT id, client, date, time, tg_id
     FROM appointments
     WHERE date = $1 AND status = 'approved' AND reminded = false`,
            [targetDate]
          )
          .then(result => {
            const rows = result.rows;
            if (rows.length === 0) return;

            rows.forEach(a => {
              // 🔔 повідомлення клієнту
              bot.sendMessage(
                a.tg_id,
                `⏰ *Нагадування про ваш манікюр!*

📅 Дата: ${a.date}
⏰ Час: ${a.time}

Чекаю вас завтра 🌸`,
                { parse_mode: "Markdown" }
              );

              // 🔔 повідомлення адміна
              bot.sendMessage(
                ADMIN_TG_ID,
                `📢 *Нагадування відправлено клієнту:* ${a.client}

📅 ${a.date}
⏰ ${a.time}`,
                { parse_mode: "Markdown" }
              );

              // помічаємо як нагадано
              pool.query(`UPDATE appointments SET reminded = true WHERE id = $1`, [a.id])
                .catch(err => console.error("Reminder update error:", err));
            });
          })
          .catch(err => console.error("Reminder query error:", err));
        });

        // =============== HOURLY REMINDERS (3 HOURS BEFORE) ===============
        setInterval(() => {
          const now = new Date();

          pool.query(
            `
    SELECT a.id, a.client, a.date, a.time, a.tg_id, r.notified
    FROM appointments a
    JOIN reminders r ON a.id = r.appointment_id
    WHERE a.status = 'approved' AND r.notified = false
    `,
            []
          )
          .then(result => {
            const rows = result.rows;
            rows.forEach(row => {
              const appointmentDateTime = new Date(`${row.date}T${row.time}:00`);
              const diffMs = appointmentDateTime - now;
              const diffHours = diffMs / 1000 / 60 / 60;

              // 🔥 Надсилаємо за 3 години
              if (diffHours <= 3 && diffHours > 2.9) {
                bot.sendMessage(
                  row.tg_id,
                  `⏰ *Нагадування!*\n\nЧерез 3 години у вас манікюр 💅\n\n📅 ${row.date}\n⏰ ${row.time}`,
                  { parse_mode: "Markdown" }
                );

                pool.query(`UPDATE reminders SET notified = true WHERE appointment_id = $1`, [row.id])
                  .catch(err => console.error("Reminder notified update error:", err));
              }
            });
          })
          .catch(err => console.error("Hourly reminder query error:", err));
        }, 5 * 60 * 1000); // кожні 5 хвилин
        setInterval(() => {
          const now = new Date();

          pool.query(
            `SELECT id, date, time FROM work_slots WHERE is_booked = false`,
            []
          )
          .then(result => {
            const rows = result.rows;
            rows.forEach(slot => {
              const slotTime = new Date(`${slot.date}T${slot.time}:00`);
              const diffMinutes = (slotTime - now) / 1000 / 60;

              if (diffMinutes <= 30) {
                pool.query(`DELETE FROM work_slots WHERE id = $1`, [slot.id])
                  .catch(err => console.error("Slot cleanup error:", err));
              }
            });
          })
          .catch(err => console.error("Slot cleanup query error:", err));
        }, 5 * 60 * 1000); // кожні 5 хв


        // Webhook route for bot
        app.post('/bot', (req, res) => {
          bot.processUpdate(req.body);
          res.sendStatus(200);
        });

        // Serve client build (SPA) if it exists — fixes "Cannot GET /" on deployment
        const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
        console.log('Client build path:', clientBuildPath, 'exists=', fs.existsSync(clientBuildPath));
        if (fs.existsSync(clientBuildPath)) {
          app.use(express.static(clientBuildPath));

          // Explicit root route to help debug deployments that return "Cannot GET /"
          app.get('/', (req, res) => {
            res.sendFile(path.join(clientBuildPath, 'index.html'));
          });

          // SPA fallback: send index.html for non-API, non-bot, non-upload requests
          app.use((req, res, next) => {
            if (req.path.startsWith('/api') || req.path.startsWith('/bot') || req.path.startsWith('/uploads')) return next();
            res.sendFile(path.join(clientBuildPath, 'index.html'));
          });
        } else {
          console.warn('Warning: client/build not found. Static files will not be served.');
        }
        // =============== START SERVER ===============
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () =>
          console.log(`🔥 SERVER ON PORT ${PORT}`))
