import cron from 'cron-parser';

try {
    const simDate = new Date('2026-03-16T11:00:00-03:00'); // 11:00 BRT
    const interval = cron.parseExpression('0 11 * * *', { 
        tz: 'America/Sao_Paulo',
        currentDate: simDate 
    });
    
    console.log('simDate:', simDate.toISOString());
    console.log('next:', interval.next().toDate().toISOString());
    
    const intervalPrev = cron.parseExpression('0 11 * * *', { 
        tz: 'America/Sao_Paulo',
        currentDate: simDate 
    });
    console.log('prev:', intervalPrev.prev().toDate().toISOString());
    
} catch (e) {
    console.error(e);
}
