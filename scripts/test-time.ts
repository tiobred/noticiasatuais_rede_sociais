
const now = new Date();
const brTime = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
    hour12: false
}).format(now).replace(/[^0-9:]/g, '');

console.log('Current Date (UTC):', now.toISOString());
console.log('BR Time (São Paulo):', brTime);
const [brH, brM] = brTime.split(':').map(Number);
console.log('Parsed H:', brH, 'M:', brM);
