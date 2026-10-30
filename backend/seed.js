
const db = require('./db');
const fs = require('fs');
const path = require('path');

// Garante que a pasta de uploads exista antes de gravar arquivos.
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const user = db
  .prepare("SELECT id FROM users WHERE email = 'rodrigo@jsd.demo'")
  .get();

if (
  user &&
  !db.prepare('SELECT id FROM payslips LIMIT 1').get()
) {
  const filename = 'demo-holerite.pdf';
  const filePath = path.join(uploadsDir, filename);

  const pdfContent = Buffer.from(
    '%PDF-1.4\n' +
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]>>endobj\n' +
    'trailer<</Root 1 0 R>>\n' +
    '%%EOF'
  );

  fs.writeFileSync(filePath, pdfContent);

  db.prepare(
    'INSERT INTO payslips(user_id, month, filename, original_name) VALUES(?,?,?,?)'
  ).run(
    user.id,
    'Setembro/2026',
    filename,
    'Holerite_Setembro_2026_DEMONSTRACAO.pdf'
  );
}
