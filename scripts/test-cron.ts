import cronParser from 'cron-parser';

function matchesCron(expression: string, date: Date = new Date()): boolean {
    try {
        const minuteStart = new Date(date);
        minuteStart.setSeconds(0, 0);
        const backDate = new Date(minuteStart.getTime() - 1000);
        const interval = cronParser.parseExpression(expression, { 
            tz: 'America/Sao_Paulo', 
            currentDate: backDate 
        });
        const nextDate = interval.next().toDate();
        const diffMs = Math.abs(nextDate.getTime() - minuteStart.getTime());
        return diffMs < 1000;
    } catch (e) {
        return false;
    }
}

// simulate now being 8:00 in Sao Paulo
const testDate = new Date('2025-07-28T11:00:00.000Z'); // 28 jul 2025 is Monday, 08:00 in SP (GMT-3)
console.log('Match?', matchesCron('0 8,18 * * 1,3,5,6,0', testDate));
