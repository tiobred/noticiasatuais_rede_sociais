require('dotenv').config();
const accounts = JSON.parse(process.env.INSTAGRAM_ACCOUNTS || '[]');
console.log('COUNT:', accounts.length);
accounts.forEach(acc => {
    console.log(`[ACC] ID=${acc.id} USR=${acc.username} UID=${acc.userId}`);
});
