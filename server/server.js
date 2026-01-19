const express = require('express');
const sqlite3 = require('sqlite3').verbose();
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

// 👉 віддаємо React build
app.use(express.static(path.join(__dirname, "build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});


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
const db = new sqlite3.Database('manicure.db');
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS work_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      time TEXT,
      is_booked INTEGER DEFAULT 0
    )
  `);



  db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      reference_image TEXT
      
    )
  `);

  db.run(`ALTER TABLE appointments ADD COLUMN reminded INTEGER DEFAULT 0`, () => { });
  db.run(`ALTER TABLE appointments ADD COLUMN service TEXT`, () => { });
  db.run(`ALTER TABLE appointments ADD COLUMN price INTEGER`, () => { });
  db.run(`
  CREATE TABLE IF NOT EXISTS reminders (
    appointment_id INTEGER UNIQUE,
    notified INTEGER DEFAULT 0
  )
    
`);

  db.run(`
    CREATE TABLE IF NOT EXISTS client_points (
      tg_id INTEGER PRIMARY KEY,
      points INTEGER DEFAULT 0
    )
  `);
  db.run(`ALTER TABLE client_points ADD COLUMN referral_discount_available INTEGER DEFAULT 0`, () => {});

  // Price list tables
  db.run(`
    CREATE TABLE IF NOT EXISTS service_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      order_index INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      is_promotion INTEGER DEFAULT 0,
      discount_price INTEGER,
      order_index INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (category_id) REFERENCES service_categories(id)
    )
  `);

  // Promotions and referrals tables
  db.run(`
    CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      discount_type TEXT, -- 'percentage' or 'fixed'
      discount_value INTEGER,
      is_active INTEGER DEFAULT 1,
      valid_from TEXT,
      valid_until TEXT,
      conditions TEXT, -- JSON string for conditions
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS referral_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tg_id INTEGER NOT NULL,
      code TEXT UNIQUE NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      used_count INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS referral_uses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referral_code_id INTEGER,
      used_by_tg_id INTEGER,
      appointment_id INTEGER,
      discount_applied INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referral_code_id) REFERENCES referral_codes(id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    )
  `);

});

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
    db.get(`SELECT COUNT(*) as count FROM appointments WHERE tg_id = ? AND status != 'canceled'`, [tg_id], (err, firstTimeRow) => {
      if (err) return res.status(500).json({ error: "DB error" });

      let finalPrice = price;
      let discountApplied = 0;
      let referralInfo = null;

      // Apply first-time discount (20%)
      if (firstTimeRow.count === 0) {
        discountApplied = Math.round(price * 0.2);
        finalPrice = price - discountApplied;
      }

      // Check for referral discount available
      db.get(`SELECT referral_discount_available FROM client_points WHERE tg_id = ?`, [tg_id], (err, referralRow) => {
        if (err) return res.status(500).json({ error: "DB error" });

        if (referralRow && referralRow.referral_discount_available) {
          const referralDiscount = Math.round(price * 0.2);
          finalPrice = finalPrice - referralDiscount;
          discountApplied += referralDiscount;
          db.run(`UPDATE client_points SET referral_discount_available = 0 WHERE tg_id = ?`, [tg_id], (err) => {
            if (err) console.error('Error resetting referral discount:', err);
          });
        }

        // Handle referral code if provided
        if (referral_code) {
          db.get(`SELECT id, tg_id as referrer_tg_id FROM referral_codes WHERE code = ? AND is_active = 1`, [referral_code], (err, codeRow) => {
            if (err) return res.status(500).json({ error: "DB error" });

            if (codeRow) {
              // Check if user already used this referral code
              db.get(`SELECT id FROM referral_uses WHERE referral_code_id = ? AND used_by_tg_id = ?`, [codeRow.id, tg_id], (err, useRow) => {
                if (err) return res.status(500).json({ error: "DB error" });

                if (!useRow) {
                  // Give referral discount to the referrer
                  db.run(`UPDATE client_points SET referral_discount_available = 1 WHERE tg_id = ?`, [codeRow.referrer_tg_id], (err) => {
                    if (err) console.error('Error updating referral discount:', err);
                  });

                  // Record the referral use
                  db.run(`INSERT INTO referral_uses (referral_code_id, used_by_tg_id, discount_applied) VALUES (?, ?, 0)`, [codeRow.id, tg_id], (err) => {
                    if (err) console.error('Error inserting referral use:', err);
                  });

                  referralInfo = {
                    code_id: codeRow.id,
                    referrer_tg_id: codeRow.referrer_tg_id,
                    discount_available: true
                  };
                }

                createAppointment();
              });
            } else {
              createAppointment();
            }
          });
        } else {
          createAppointment();
        }
      });

      function createAppointment() {
        db.get(
          `SELECT date, time FROM work_slots WHERE id = ? AND is_booked = 0`,
          [slot_id],
          (err, slot) => {
            if (err || !slot) {
              return res.status(400).json({ error: "Slot not available" });
            }

            db.run(
              `INSERT INTO appointments 
              (client, date, time, design, length, type, service, price, comment, reference_image, tg_id, username)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                client,
                slot.date,
                slot.time,
                design,
                length,
                type,
                price,
                finalPrice,
                comment,
                referenceImage,
                tg_id,
                username
              ],
              function (err) {
                if (err) {
                  console.error("INSERT error:", err);
                  return res.status(500).json({ error: "DB error" });
                }
                console.log("Appointment inserted with id", this.lastID);
                const appointmentId = this.lastID;

                db.run(
                  `INSERT INTO reminders (appointment_id) VALUES (?)`,
                  [appointmentId]
                );

                // Handle referral use
                if (referralInfo) {
                  db.run(
                    `INSERT INTO referral_uses (referral_code_id, used_by_tg_id, appointment_id, discount_applied) VALUES (?, ?, ?, ?)`,
                    [referralInfo.code_id, tg_id, appointmentId, referralInfo.discount],
                    (err) => {
                      if (!err) {
                        // Update referral code usage count
                        db.run(`UPDATE referral_codes SET used_count = used_count + 1 WHERE id = ?`, [referralInfo.code_id]);

                        // Give referrer 10zl bonus (add to points or notify)
                        // For now, we'll just log it - can be extended to add points
                        console.log(`Referral bonus: ${referralInfo.referrer_tg_id} gets 10zl for referring ${tg_id}`);
                      }
                    }
                  );
                }

                db.run(
                  `UPDATE work_slots SET is_booked = 1 WHERE id = ?`,
                  [slot_id]
                );

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
              }
            );
          }
        );
      }
    });
  }
);
        app.get('/api/appointment/my', (req, res) => {
          const tg_id = req.query.tg_id;

          if (!tg_id) {
            return res.status(400).json({ error: "Missing tg_id" });
          }

          db.get(
            `
    SELECT id, date, time, design, length, type, status, comment
    FROM appointments
    WHERE tg_id = ?
      AND status != 'canceled'
    ORDER BY date DESC, time(date || ' ' || time) DESC
    LIMIT 1
    `,
            [tg_id],
            (err, row) => {
              if (err) {
                console.error("DB ERROR:", err);
                return res.status(500).json({ error: "DB error" });
              }

              // 👇 ЯВНО логнемо
              console.log("📌 MY APPOINTMENT:", row);

              res.json(row || null);
            }
          );
        });

        // ============== CLIENT CANCEL APPOINTMENT1 ===============
        app.post('/api/appointment/cancel', (req, res) => {
          const { tg_id } = req.body;

          if (!tg_id) return res.status(400).json({ error: "Missing tg_id" });

          db.get(
            `SELECT id, date, time, design, length, comment, type FROM appointments WHERE tg_id = ? AND status != 'canceled'`,
            [tg_id],
            (err, row) => {
              if (err || !row)
                return res.status(400).json({ error: "No active appointment" });

              // 1️⃣ Позначаємо запис як скасований
              db.run(
                `UPDATE appointments SET status='canceled' WHERE id = ?`,
                [row.id]
              );

              // 2️⃣ Звільняємо слот
              db.run(
                `UPDATE work_slots SET is_booked = 0 WHERE date = ? AND time = ?`,
                [row.date, row.time]
              );

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
            }
          );
        });

        // =============== CLIENT: GET BONUS POINTS ===============
        app.get('/api/client/points', (req, res) => {
          const tg_id = req.query.tg_id;

          if (!tg_id) return res.status(400).json({ error: "Missing tg_id" });

          db.get(
            `SELECT points FROM client_points WHERE tg_id = ?`,
            [tg_id],
            (err, row) => {
              if (err) return res.status(500).json({ error: "DB error" });

              res.json({ points: row ? row.points : 0 });
            }
          );
        });

        // =============== CLIENT: SPEND BONUS POINTS ===============
        app.post('/api/client/spend-points', (req, res) => {
          const { tg_id, points_to_spend } = req.body;

          if (!tg_id || !points_to_spend) return res.status(400).json({ error: "Missing tg_id or points_to_spend" });

          db.get(
            `SELECT points FROM client_points WHERE tg_id = ?`,
            [tg_id],
            (err, row) => {
              if (err) return res.status(500).json({ error: "DB error" });
              const currentPoints = row ? row.points : 0;
              if (currentPoints < points_to_spend) return res.status(400).json({ error: "Not enough points" });

              db.run(
                `UPDATE client_points SET points = points - ? WHERE tg_id = ?`,
                [points_to_spend, tg_id]
              );

              // Відправити повідомлення клієнту
              let rewardText = "";
              if (points_to_spend === 10) rewardText = "Безкоштовний дизайн активовано! 🎨";
              else if (points_to_spend === 20) rewardText = "Знижка 30% активована! 💰";
              else if (points_to_spend === 30) rewardText = "Повний манікюр безкоштовно активовано! 💅";

              bot.sendMessage(tg_id, `🎁 *Винагорода активована!*\n\n${rewardText}`, { parse_mode: "Markdown" });

              // Повідомити адміна
              bot.sendMessage(ADMIN_TG_ID, `🎁 Клієнт витратив ${points_to_spend} балів на винагороду: ${rewardText}`, { parse_mode: "Markdown" });

              res.json({ ok: true });
            }
          );
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
            sql += ' WHERE status = ?';
            params.push(status);
          }

          sql += `
  ORDER BY 
    datetime(date || ' ' || time) ASC
`;

          db.all(sql, params, (_, rows) => {
            res.json(rows);
          });
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

          db.get(
            `SELECT date, time, tg_id FROM appointments WHERE id = ?`,
            [id],
            (err, row) => {
              if (!row) return res.json({ ok: true });

              db.run(
                `UPDATE appointments SET status = ? WHERE id = ?`,
                [status, id]
              );
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
                db.run(`INSERT OR IGNORE INTO client_points (tg_id, points) VALUES (?, 0)`, [row.tg_id]);
                db.run(`UPDATE client_points SET points = points + 1 WHERE tg_id = ?`, [row.tg_id]);
              }


              // ❗ якщо скасовано — розблокувати слот
              if (status === 'canceled') {
                db.run(
                  `UPDATE work_slots SET is_booked = 0 WHERE date = ? AND time = ?`,
                  [row.date, row.time]
                );
              }


              res.json({ ok: true });
            }
          );
        });
        // =============== CLIENT: GET AVAILABLE SLOTS ===============
        app.get('/api/slots', (req, res) => {
          db.all(
            `SELECT id, date, time, is_booked FROM work_slots ORDER BY date, time`,
            [],
            (err, rows) => {
              if (err) return res.status(500).json({ error: "DB error" });

              const now = new Date();

              const filtered = rows.filter(slot => {
                const slotDate = new Date(`${slot.date}T${slot.time}:00`);
                const diffMs = slotDate - now;
                const diffMinutes = diffMs / 1000 / 60;

                return (
                  diffMinutes >= 30 &&   // ❗ показуємо лише якщо до слота ≥ 30 хв
                  slot.is_booked === 0   // ❗ слот не зайнятий
                );
              });

              res.json(filtered);
            }
          );
        });

        // =============== ADMIN: GET ALL CLIENTS ===============
        app.get('/api/admin/clients', (req, res) => {
          const initData = req.headers['x-init-data'];

          if (!initData || !validateInitData(initData))
            return res.status(403).json({ error: 'Access denied' });

          const user = JSON.parse(new URLSearchParams(initData).get('user'));
          if (!ADMIN_TG_IDS.includes(user.id))
            return res.status(403).json({ error: 'Not admin' });

          db.all(
            `
    SELECT 
      tg_id,
      client,
      MAX(date || ' ' || time) AS last_visit
    FROM appointments
    GROUP BY tg_id, client
    ORDER BY last_visit DESC
    `,
            [],
            (_, rows) => res.json(rows)
          );
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

          db.all(
            `
    SELECT 
      id, date, time, design, length, type, status, comment
    FROM appointments
    WHERE tg_id = ?
    ORDER BY date DESC, time(date || ' ' || time) DESC
    `,
            [tg_id],
            (_, rows) => res.json(rows)
          );
        });
        // =============== ADMIN: GET ALL WORK SLOTS ===============
        app.get('/api/admin/slots', (req, res) => {
          const initData = req.headers['x-init-data'];

          if (!initData || !validateInitData(initData))
            return res.status(403).json({ error: 'Access denied' });

          const user = JSON.parse(new URLSearchParams(initData).get('user'));
          if (!ADMIN_TG_IDS.includes(user.id))
            return res.status(403).json({ error: 'Not admin' });

          db.all(
            `
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

    `,
            [],
            (_, rows) => res.json(rows)
          );
        });


        // ====== ADD WORK SLOT ======
        app.post('/api/admin/add-slot', (req, res) => {
          const { date, time } = req.body;
          const initData = req.headers['x-init-data'];

          if (!initData || !validateInitData(initData))
            return res.status(403).json({ error: 'Access denied' });

          const user = JSON.parse(new URLSearchParams(initData).get('user'));
          if (!ADMIN_TG_IDS.includes(user.id))
            return res.status(403).json({ error: 'Not admin' });

          db.run(
            `INSERT INTO work_slots (date, time) VALUES (?, ?)`,
            [date, time],
            err => {
              if (err) return res.status(500).json({ error: 'DB error' });
              res.json({ ok: true });
            }
          );
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

          db.run(
            `DELETE FROM work_slots WHERE id = ? AND is_booked = 0`,
            [id],
            err => {
              if (err) return res.status(500).json({ error: 'DB error' });
              res.json({ ok: true });
            }
          );
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
          db.get(
            `SELECT date, time, tg_id FROM appointments WHERE id = ?`,
            [id],
            (err, row) => {
              if (!row) return res.json({ ok: true });

              // 2️⃣ видаляємо запис
              db.run(`DELETE FROM appointments WHERE id = ?`, [id]);

              // 3️⃣ розблоковуємо слот
              db.run(
                `UPDATE work_slots SET is_booked = 0 WHERE date = ? AND time = ?`,
                [row.date, row.time]
              );
              bot.sendMessage(
                row.tg_id,
                `🗑 *Ваш запис було видалено адміністратором*

📅 ${row.date}
⏰ ${row.time}

Буду рада новому запису 💅`,
                { parse_mode: "Markdown" }
              );


              res.json({ ok: true });
            }
          );
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

          db.all(`
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
    WHERE c.is_active = 1
    ORDER BY c.order_index, c.id, s.order_index, s.id
  `, [], (err, rows) => {
            if (err) return res.status(500).json({ error: 'DB error' });

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
          });
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
            db.run(
              `UPDATE service_categories SET name = ?, description = ?, order_index = ?, is_active = ? WHERE id = ?`,
              [name, description, order_index || 0, is_active ? 1 : 0, id],
              function (err) {
                if (err) return res.status(500).json({ error: 'DB error' });
                res.json({ id: id });
              }
            );
          } else {
            // Insert
            db.run(
              `INSERT INTO service_categories (name, description, order_index, is_active) VALUES (?, ?, ?, ?)`,
              [name, description, order_index || 0, is_active ? 1 : 0],
              function (err) {
                if (err) return res.status(500).json({ error: 'DB error' });
                res.json({ id: this.lastID });
              }
            );
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
          db.run(`DELETE FROM services WHERE category_id = ?`, [categoryId], (err) => {
            if (err) return res.status(500).json({ error: 'DB error' });

            // Then delete the category
            db.run(`DELETE FROM service_categories WHERE id = ?`, [categoryId], (err) => {
              if (err) return res.status(500).json({ error: 'DB error' });
              res.json({ ok: true });
            });
          });
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
            db.run(
              `UPDATE services SET category_id = ?, name = ?, description = ?, price = ?, is_promotion = ?, discount_price = ?, order_index = ?, is_active = ? WHERE id = ?`,
              [category_id, name, description, price, is_promotion ? 1 : 0, discount_price, order_index || 0, is_active ? 1 : 0, id],
              function (err) {
                if (err) return res.status(500).json({ error: 'DB error' });
                res.json({ id: id });
              }
            );
          } else {
            // Insert
            db.run(
              `INSERT INTO services (category_id, name, description, price, is_promotion, discount_price, order_index, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [category_id, name, description, price, is_promotion ? 1 : 0, discount_price, order_index || 0, is_active ? 1 : 0],
              function (err) {
                if (err) return res.status(500).json({ error: 'DB error' });
                res.json({ id: this.lastID });
              }
            );
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

          db.run(`DELETE FROM services WHERE id = ?`, [serviceId], (err) => {
            if (err) return res.status(500).json({ error: 'DB error' });
            res.json({ ok: true });
          });
        });

        // Get prices for client booking
        app.get('/api/prices', (req, res) => {
          db.all(`
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
    WHERE c.is_active = 1 AND (s.is_active = 1 OR s.id IS NULL)
    ORDER BY c.order_index, c.id, s.order_index, s.id
  `, [], (err, rows) => {
            if (err) return res.status(500).json({ error: 'DB error' });

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
          });
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

          db.all(`
    SELECT id, name, description, discount_type, discount_value, is_active, valid_from, valid_until, conditions, created_at
    FROM promotions
    ORDER BY created_at DESC
  `, [], (err, rows) => {
            if (err) return res.status(500).json({ error: 'DB error' });
            res.json(rows);
          });
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
            db.run(
              `UPDATE promotions SET name = ?, description = ?, discount_type = ?, discount_value = ?, is_active = ?, valid_from = ?, valid_until = ?, conditions = ? WHERE id = ?`,
              [name, description, discount_type, discount_value, is_active ? 1 : 0, valid_from, valid_until, conditions, id],
              function (err) {
                if (err) return res.status(500).json({ error: 'DB error' });
                res.json({ id: id });
              }
            );
          } else {
            // Insert
            db.run(
              `INSERT INTO promotions (name, description, discount_type, discount_value, is_active, valid_from, valid_until, conditions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [name, description, discount_type, discount_value, is_active ? 1 : 0, valid_from, valid_until, conditions],
              function (err) {
                if (err) return res.status(500).json({ error: 'DB error' });
                res.json({ id: this.lastID });
              }
            );
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

          db.run(`DELETE FROM promotions WHERE id = ?`, [promotionId], (err) => {
            if (err) return res.status(500).json({ error: 'DB error' });
            res.json({ ok: true });
          });
        });

        // Get user's referral code
        app.get('/api/referral/code', (req, res) => {
          const tg_id = req.query.tg_id;

          if (!tg_id) return res.status(400).json({ error: "Missing tg_id" });

          // Check if user already has a referral code
          db.get(`SELECT id, code, used_count FROM referral_codes WHERE tg_id = ? AND is_active = 1`, [tg_id], (err, row) => {
            if (err) return res.status(500).json({ error: 'DB error' });

            if (row) {
              res.json({ code: row.code, used_count: row.used_count });
            } else {
              // Generate new referral code
              const crypto = require('crypto');
              const code = crypto.randomBytes(4).toString('hex').toUpperCase();

              db.run(`INSERT INTO referral_codes (tg_id, code) VALUES (?, ?)`, [tg_id, code], function (err) {
                if (err) return res.status(500).json({ error: 'DB error' });
                res.json({ code: code, used_count: 0 });
              });
            }
          });
        });

        // Apply referral code
        app.post('/api/referral/apply', (req, res) => {
          const { referral_code, tg_id, appointment_price } = req.body;

          if (!referral_code || !tg_id || !appointment_price) {
            return res.status(400).json({ error: "Missing required fields" });
          }

          // Check if referral code exists and is active
          db.get(`SELECT id, tg_id as referrer_tg_id FROM referral_codes WHERE code = ? AND is_active = 1`, [referral_code], (err, codeRow) => {
            if (err) return res.status(500).json({ error: 'DB error' });
            if (!codeRow) return res.status(400).json({ error: "Invalid referral code" });

            // Check if user already used this referral code
            db.get(`SELECT id FROM referral_uses WHERE referral_code_id = ? AND used_by_tg_id = ?`, [codeRow.id, tg_id], (err, useRow) => {
              if (err) return res.status(500).json({ error: 'DB error' });
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
          });
        });

        // Get active promotions for client
        app.get('/api/promotions', (req, res) => {
          const now = new Date().toISOString();

          db.all(`
    SELECT id, name, description, discount_type, discount_value, conditions
    FROM promotions
    WHERE is_active = 1
    AND (valid_from IS NULL OR valid_from <= ?)
    AND (valid_until IS NULL OR valid_until >= ?)
    ORDER BY created_at DESC
  `, [now, now], (err, rows) => {
            if (err) return res.status(500).json({ error: 'DB error' });
            res.json(rows);
          });
        });

        // Check if user is first-time client
        app.get('/api/client/first-time', (req, res) => {
          const tg_id = req.query.tg_id;

          if (!tg_id) return res.status(400).json({ error: "Missing tg_id" });

          db.get(`SELECT COUNT(*) as count FROM appointments WHERE tg_id = ? AND status != 'canceled'`, [tg_id], (err, row) => {
            if (err) return res.status(500).json({ error: 'DB error' });
            res.json({ is_first_time: row.count === 0 });
          });
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

          db.all(
            `SELECT id, client, date, time, tg_id 
     FROM appointments 
     WHERE date = ? AND status = 'approved' AND reminded = 0`,
            [targetDate],
            (err, rows) => {
              if (err || rows.length === 0) return;

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
                db.run(`UPDATE appointments SET reminded = 1 WHERE id = ?`, [a.id]);
              });
            }
          );
        });

        // =============== HOURLY REMINDERS (3 HOURS BEFORE) ===============
        setInterval(() => {
          const now = new Date();

          db.all(
            `
    SELECT a.id, a.client, a.date, a.time, a.tg_id, r.notified
    FROM appointments a
    JOIN reminders r ON a.id = r.appointment_id
    WHERE a.status = 'approved' AND r.notified = 0
    `,
            [],
            (_, rows) => {
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

                  db.run(`UPDATE reminders SET notified = 1 WHERE appointment_id = ?`, [
                    row.id
                  ]);
                }
              });
            }
          );
        }, 5 * 60 * 1000); // кожні 5 хвилин
        setInterval(() => {
          const now = new Date();

          db.all(
            `SELECT id, date, time FROM work_slots WHERE is_booked = 0`,
            [],
            (_, rows) => {
              rows.forEach(slot => {
                const slotTime = new Date(`${slot.date}T${slot.time}:00`);
                const diffMinutes = (slotTime - now) / 1000 / 60;

                if (diffMinutes <= 30) {
                  db.run(`DELETE FROM work_slots WHERE id = ?`, [slot.id]);
                }
              });
            }
          );
        }, 5 * 60 * 1000); // кожні 5 хв


        // Webhook route for bot
        app.post('/bot', (req, res) => {
          bot.processUpdate(req.body);
          res.sendStatus(200);
        });

        // =============== START SERVER ===============
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () =>
          console.log(`🔥 SERVER ON PORT ${PORT}`))
