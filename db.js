const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'jsd-demo.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'employee', active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS payslips (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, month TEXT NOT NULL,
 filename TEXT NOT NULL, original_name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS benefits (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, month TEXT NOT NULL,
 amount REAL NOT NULL, note TEXT DEFAULT '', FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS requests (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, category TEXT NOT NULL,
 subject TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Aberta',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS announcements (
 id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, category TEXT NOT NULL,
 body TEXT NOT NULL, author TEXT NOT NULL, featured INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS appointments (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, date TEXT NOT NULL,
 time TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Solicitado',
 FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
if (!count) {
  const add = db.prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)');
  const users = [
    ['Rodrigo Silva','rodrigo@jsd.demo','employee'],
    ['Marcos Gestor','gestor@jsd.demo','supervisor'],
    ['Equipe RH','rh@jsd.demo','hr'],
    ['Administrador JSD','admin@jsd.demo','admin']
  ];
  for (const [name,email,role] of users) add.run(name,email,bcrypt.hashSync('Jsd@12345',10),role);

  const ids = db.prepare('SELECT id,email FROM users').all();
  const id = email => ids.find(x=>x.email===email).id;
  const benefit = db.prepare('INSERT INTO benefits(user_id,month,amount,note) VALUES(?,?,?,?)');
  for (const [month,amount] of [['Outubro/2026',650],['Setembro/2026',650],['Agosto/2026',600]])
    benefit.run(id('rodrigo@jsd.demo'),month,amount,'Crédito demonstrativo');
  const ann = db.prepare('INSERT INTO announcements(title,category,body,author,featured) VALUES(?,?,?,?,?)');
  ann.run('Benefícios JSD','Geral','Confira as informações demonstrativas sobre os benefícios disponibilizados aos colaboradores.','Helen Ramos Lima',1);
  ann.run('Atualização do portal','TI','Estamos apresentando uma nova experiência digital para os colaboradores.','Equipe de TI',0);
  const req = db.prepare('INSERT INTO requests(user_id,category,subject,description,status) VALUES(?,?,?,?,?)');
  req.run(id('rodrigo@jsd.demo'),'RH','Dúvida sobre benefício','Gostaria de confirmar a competência do benefício.','Em análise');
}
module.exports = db;
