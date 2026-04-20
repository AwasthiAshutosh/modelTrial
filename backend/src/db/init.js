const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../interior_design.db');
const db = new Database(dbPath);

const initDb = () => {
    // Users Table
    db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

    // Designs Table — stores generation history linked to the ML service
    db.prepare(`
    CREATE TABLE IF NOT EXISTS designs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      original_image TEXT NOT NULL,
      generated_image TEXT,
      style TEXT NOT NULL,
      detected_objects TEXT,
      style_predictions TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `).run();

    console.log('Database initialized successfully');
};

module.exports = { db, initDb };
