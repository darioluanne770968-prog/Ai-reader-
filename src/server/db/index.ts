import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { schema } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../../data/reader.db');

// 确保data目录存在
import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 初始化数据库schema
export function initDatabase() {
  const statements = schema.split(';').filter(s => s.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        db.exec(statement);
      } catch (err) {
        // 忽略已存在的表/索引错误
        const error = err as Error;
        if (!error.message.includes('already exists')) {
          console.error('SQL Error:', error.message);
        }
      }
    }
  }
  console.log('Database initialized successfully');
}

export default db;
