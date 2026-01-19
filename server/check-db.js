const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('manicure.db');

db.all("SELECT * FROM appointments", [], (err, rows) => {
  if (err) {
    console.error("DB error:", err);
  } else {
    console.log("🔥 Записи у базі:");
    console.log(rows);
  }
});
