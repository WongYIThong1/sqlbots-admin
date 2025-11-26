const bcrypt = require('bcryptjs');

const password = '@JBc10062022';
const hash = bcrypt.hashSync(password, 10);

console.log('Password hash:', hash);
console.log('\nUse this hash to update the database:');
console.log(`UPDATE admins SET password_hash = '${hash}' WHERE email = 'wongyithong18@gmail.com';`);

