const bcrypt = require('bcryptjs');

const password = '@JBc10062022';
console.log('Testing password:', password);

// Generate hash
const hash = bcrypt.hashSync(password, 10);
console.log('\nGenerated hash:', hash);

// Verify immediately
const verify1 = bcrypt.compareSync(password, hash);
console.log('Immediate verification:', verify1);

// Test with async
bcrypt.compare(password, hash, (err, result) => {
  console.log('Async verification:', result);
  if (err) console.error('Error:', err);
});

// Test with promise
bcrypt.compare(password, hash).then(result => {
  console.log('Promise verification:', result);
});

