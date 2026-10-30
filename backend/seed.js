const db=require('./db'); const fs=require('fs'); const path=require('path');
const user=db.prepare("SELECT id FROM users WHERE email='rodrigo@jsd.demo'").get();
if(user && !db.prepare('SELECT id FROM payslips LIMIT 1').get()){
 const filename='demo-holerite.pdf'; fs.writeFileSync(path.join(__dirname,'uploads',filename),Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'));
 db.prepare('INSERT INTO payslips(user_id,month,filename,original_name) VALUES(?,?,?,?)').run(user.id,'Setembro/2026',filename,'Holerite_Setembro_2026_DEMONSTRACAO.pdf');
}
