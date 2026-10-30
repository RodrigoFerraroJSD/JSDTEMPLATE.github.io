# Portal Corporativo JSD Telecom — demonstração

MVP demonstrativo em HTML, CSS, JavaScript, Node.js/Express e SQLite. Não usa Firebase e não se conecta aos sistemas reais da empresa.

## Requisitos
- Node.js 18 ou superior
- npm

## Executar
1. Extraia o projeto.
2. No terminal, entre na pasta `jsd-portal`.
3. Execute `npm install`.
4. Copie `.env.example` para `.env` e altere `JWT_SECRET`.
5. Execute `npm start`.
6. Acesse http://localhost:3000

## Contas de demonstração
As senhas são criadas no primeiro início e devem ser alteradas em uma instalação real.

| Perfil | E-mail | Senha |
|---|---|---|
| Colaborador | rodrigo@jsd.demo | Jsd@12345 |
| Supervisor | gestor@jsd.demo | Jsd@12345 |
| RH | rh@jsd.demo | Jsd@12345 |
| Administrador | admin@jsd.demo | Jsd@12345 |

## O que funciona nesta demonstração
- Login e logout com JWT em cookie HttpOnly.
- Controle de acesso por perfil no servidor.
- Dashboard e dados demonstrativos.
- Lista de holerites por colaborador e download de PDFs de exemplo.
- Valor mensal do vale alimentação.
- Espelho de ponto demonstrativo.
- Abertura e acompanhamento de solicitações.
- Mural de comunicados.
- Agenda psicológica demonstrativa.
- Administração de usuários e publicação de holerites/comunicados.

## Limites importantes
Este projeto é um protótipo local. Os dados e PDFs são fictícios. A agenda não realiza atendimento real; ponto, vale e holerites não estão integrados a sistemas corporativos. Antes de produção, implementar HTTPS, política de backup, gestão de segredos, trilha de auditoria, proteção CSRF, política de privacidade/LGPD, recuperação de senha por e-mail e revisão de segurança. Não usar dados reais de colaboradores nesta demonstração.

A camada de banco fica isolada em `backend/db.js` para facilitar uma futura migração para Firebase/Firestore.
