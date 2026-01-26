// ===== NODE-CRON SETUP (замість setInterval) =====
// npm install node-cron

const cron = require('node-cron');

// ===== 1️⃣ CANCEL EXPIRED PENDING APPOINTMENTS =====
// Запускається кожні 5 хвилин
cron.schedule('*/5 * * * *', async () => {
  try {
    const client = await pool.connect();
    
    // Скасувати записи, у яких статус 'pending' старше 24 годин
    const result = await client.query(`
      UPDATE appointments 
      SET status = 'canceled'
      WHERE status = 'pending' 
        AND created_at < NOW() - INTERVAL '24 hours'
      RETURNING id, tg_id, client, date, time
    `);

    const canceledCount = result.rows.length;
    if (canceledCount > 0) {
      console.log(`✅ Canceled ${canceledCount} expired pending appointments`);

      // Звільнити слоти для скасованих записів
      for (const appointment of result.rows) {
        await pool.query(
          `UPDATE work_slots SET is_booked = false 
           WHERE date = $1 AND time = $2`,
          [appointment.date, appointment.time]
        );

        // Повідомити клієнта
        await bot.sendMessage(
          appointment.tg_id,
          `⏰ *Ваш запис автоматично скасовано*\n\n` +
          `Запис від ${appointment.date} ${appointment.time} був скасований ` +
          `через невідповідь протягом 24 годин.`,
          { parse_mode: "Markdown" }
        ).catch(() => {});
      }
    }

    client.release();
  } catch (err) {
    console.error('❌ Error canceling expired appointments:', err.message);
  }
});

// ===== 2️⃣ DELETE OLD SLOTS =====
// Запускається щодня о 00:00 (опівночі)
cron.schedule('0 0 * * *', async () => {
  try {
    const client = await pool.connect();

    // Видалити слоти, які вже пройшли (старше 30 днів)
    const result = await client.query(`
      DELETE FROM work_slots 
      WHERE date < NOW()::date - INTERVAL '30 days'
      RETURNING id
    `);

    const deletedCount = result.rows.length;
    if (deletedCount > 0) {
      console.log(`✅ Deleted ${deletedCount} old slots`);
    }

    client.release();
  } catch (err) {
    console.error('❌ Error deleting old slots:', err.message);
  }
});

// ===== 3️⃣ SEND DAILY ADMIN REPORT =====
// Запускається щодня о 18:00 (6 PM)
cron.schedule('0 18 * * *', async () => {
  try {
    const client = await pool.connect();

    // Отримати статистику за останню добу
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'canceled' THEN 1 END) as canceled,
        SUM(CASE WHEN status = 'approved' THEN price ELSE 0 END) as revenue
      FROM appointments
      WHERE date = CURRENT_DATE
    `);

    const stats = result.rows[0];

    await bot.sendMessage(
      ADMIN_TG_ID,
      `📊 *Щоденний звіт за ${new Date().toLocaleDateString('uk-UA')}*\n\n` +
      `📅 Всього записів: ${stats.total_bookings}\n` +
      `✅ Підтверджено: ${stats.approved}\n` +
      `⏳ Очікує: ${stats.pending}\n` +
      `❌ Скасовано: ${stats.canceled}\n` +
      `💰 Дохід: ${stats.revenue || 0} zł`,
      { parse_mode: "Markdown" }
    ).catch(err => console.error('Report send error:', err.message));

    client.release();
  } catch (err) {
    console.error('❌ Error generating daily report:', err.message);
  }
});

// ===== 4️⃣ CLEANUP DATABASE =====
// Запускається щомісяця о 3:00 AM на 1-го числа
cron.schedule('0 3 1 * *', async () => {
  try {
    const client = await pool.connect();

    // Видалити старі нагадування (старше 90 днів)
    const deletedReminders = await client.query(`
      DELETE FROM reminders 
      WHERE appointment_id IN (
        SELECT id FROM appointments 
        WHERE created_at < NOW() - INTERVAL '90 days'
      )
    `);

    console.log(`✅ Cleaned up ${deletedReminders.rowCount} old reminders`);

    client.release();
  } catch (err) {
    console.error('❌ Error cleaning database:', err.message);
  }
});

// =====監控STATUS =====
console.log('✅ Cron jobs initialized');

/*
  📅 CRON EXPRESSIONS

  ┌───────────── second (0 - 59)
  │ ┌───────────── minute (0 - 59)
  │ │ ┌───────────── hour (0 - 23)
  │ │ │ ┌───────────── day of month (1 - 31)
  │ │ │ │ ┌───────────── month (0 - 11)
  │ │ │ │ │ ┌───────────── day of week (0 - 6) (0 = Sunday)
  │ │ │ │ │ │
  │ │ │ │ │ │
  * * * * * *

  ПРИКЛАДИ:

  */5 * * * *       - Кожні 5 хвилин
  0 0 * * *         - Щодня о 00:00 (опівночі)
  0 9 * * 1-5       - Пн-Пт о 09:00
  0 18 * * *        - Щодня о 18:00
  0 0 1 * *         - 1-го числа кожного місяця
  0 0 * * 0         - Кожну неділю о 00:00
  */30 * * * *      - Кожні 30 хвилин
  0 */4 * * *       - Кожні 4 години

  ВАЖНО:
  - node-cron запускається на конкретній машині
  - На Railway це ОСТАНИЙ інстанс, який стартував
  - Якщо потрібна синхронізація → використай Redis

*/
