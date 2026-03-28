import cron from 'cron-parser';

try {
    const interval = cron.parseExpression('0 11 * * *');
    console.log('Interval prototype keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(interval)));
    console.log('Interval keys:', Object.keys(interval));
} catch (e) {
    console.error(e);
}
