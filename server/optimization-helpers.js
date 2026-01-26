// 🔧 SERVER OPTIMIZATION HELPERS
// Додай це в server.js

// ===== Telegram WebApp Security Middleware =====
function validateInitData(initData) {
  if (!initData) return false;
  
  try {
    // У production використовуй крипто перевірку
    // Для dev достатньо базової перевірки
    const params = new URLSearchParams(initData);
    return params.has('user') && params.has('auth_date');
  } catch (e) {
    return false;
  }
}

const tgAuth = (req, res, next) => {
  const initData = req.headers['x-init-data'];
  
  if (process.env.NODE_ENV !== 'production') {
    // У development дозволяємо без auth
    return next();
  }
  
  if (!initData || !validateInitData(initData)) {
    console.warn('⚠️ Unauthorized API call:', req.path);
    return res.sendStatus(403);
  }
  
  next();
};

// Застосувати до адмін маршрутів
// Перед визначенням маршрутів додай:
// const adminRoutes = ['/api/admin/*', '/api/analytics/*'];
// adminRoutes.forEach(route => app.use(route, tgAuth));

// ===== NODE_ENV логування helper =====
const logger = {
  log: (msg, data) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(msg, data);
    }
  },
  error: (msg, error) => {
    console.error(msg, error.message);
  },
  warn: (msg, data) => {
    console.warn(msg, data);
  }
};

// Приклад використання:
// logger.log('📩 POST /api/appointment:', { client, tg_id });
// logger.error('❌ DB error:', err);

module.exports = {
  tgAuth,
  validateInitData,
  logger
};
