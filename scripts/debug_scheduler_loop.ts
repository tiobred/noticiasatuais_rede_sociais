import prisma from '../lib/db';
import { getMergedConfigs } from '../lib/db/config-helper';
import cronParser from 'cron-parser';
import fs from 'fs';

let logOutput = '';
function log(msg: string, ...args: any[]) {
    const text = msg + ' ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
    console.log(text);
    logOutput += text + '\n';
}

function matchesCron(expression: string, date: Date = new Date()): boolean {
    try {
        // Clone and set to start of the current minute
        const minuteStart = new Date(date);
        minuteStart.setSeconds(0, 0);
        
        // Go 1 second back (to the previous minute's last second)
        const backDate = new Date(minuteStart.getTime() - 1000);
        
        const interval = cronParser.parseExpression(expression, { 
            tz: 'America/Sao_Paulo', 
            currentDate: backDate 
        });
        
        const nextDate = interval.next().toDate();
        
        // If next execution falls into the current minute, it's a match!
        const diffMs = Math.abs(nextDate.getTime() - minuteStart.getTime());
        return diffMs < 1000; // should be exactly the same second or close enough
    } catch (e) { return false; }
}

async function main() {
    log('--- DEBUG SCHEDULER LOOP ---');
    const allAccountsStr = process.env.INSTAGRAM_ACCOUNTS || '[]';
    log('INSTAGRAM_ACCOUNTS Raw:', allAccountsStr);
    
    let allAccounts: any[] = [];
    try { allAccounts = JSON.parse(allAccountsStr); } catch (e) {}

    const now = new Date();
    const brTime = new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo', hour12: false
    }).format(now).replace(/[^0-9:]/g, ''); 
    const [brH, brM] = brTime.split(':').map(Number);

    log(`Current BR Time: ${brTime} (${brH}:${brM})`);

    const isTrue = (val: any) => val === true || val === 'true';

    // Helper for simulation
    function checkTriggers(accountTriggers: any[], simulateH: number, simulateM: number): string[] {
        const matches: string[] = [];
        const simTime = `${String(simulateH).padStart(2, '0')}:${String(simulateM).padStart(2, '0')}`;
        const simDate = new Date();
        simDate.setHours(simulateH, simulateM, 0, 0);
        // Force simulation for Sunday (0) or Monday (1)
        simDate.setDate(simDate.getDate() + (7 + (1 - simDate.getDay())) % 7); // force Monday for cron test
        
        for (const trigger of accountTriggers) {
            let match = false;
            if (trigger.type === 'minutes') {
                const mins = parseInt(trigger.value);
                match = (mins > 0 && simulateM % mins === 0);
            } else if (trigger.type === 'hours') {
                const hrs = parseInt(trigger.value);
                match = (hrs > 0 && simulateH % hrs === 0 && simulateM === 0);
            } else if (trigger.type === 'days') {
                match = (trigger.value === simTime);
            } else if (trigger.type === 'cron') {
                match = matchesCron(trigger.value, simDate);
                log(`    [SIM] cron='${trigger.value}' simDate=${simDate.toISOString()} -> Match: ${match}`);
            }
            if (match) matches.push(`[${trigger.type}] ${trigger.value}`);
        }
        return matches;
    }

    for (const account of allAccounts) {
        log(`\n> Processing Account: ID='${account.id}', Name='${account.name}'`);
        const relevantKeys = [
            'isActive', 'schedulerEnabled', 'CHANNEL_INSTAGRAM_FEED', 
            'CHANNEL_INSTAGRAM_STORY', 'CHANNEL_INSTAGRAM_REELS', 
            'CHANNEL_YOUTUBE_SHORTS', 'CHANNEL_WHATSAPP', 
            'SCHEDULER_TRIGGERS', 'POSTING_TIMES', 'postingTimes'
        ];
        
        const configMap = await getMergedConfigs(account.id, relevantKeys);
        const isActive = configMap['isActive'] !== false;
        const schedulerEnabled = configMap['schedulerEnabled'] !== false;

        const channels = {
            feed: isTrue(configMap['CHANNEL_INSTAGRAM_FEED']),
            story: isTrue(configMap['CHANNEL_INSTAGRAM_STORY']),
            reels: isTrue(configMap['CHANNEL_INSTAGRAM_REELS']),
            yt: isTrue(configMap['CHANNEL_YOUTUBE_SHORTS']),
            wa: isTrue(configMap['CHANNEL_WHATSAPP'])
        };

        const isAnyChannelEnabled = Object.values(channels).some(v => v === true);

        log(`  isActive: ${isActive}`);
        log(`  schedulerEnabled: ${schedulerEnabled}`);
        log(`  channels:`, channels);
        log(`  isAnyChannelEnabled: ${isAnyChannelEnabled}`);

        if (!isActive || !schedulerEnabled || !isAnyChannelEnabled) {
            log(`  ❌ Account SKIPPED due to above flags`);
            continue;
        }

        const triggers = configMap['SCHEDULER_TRIGGERS'] || [];
        log(`  Triggers found (${triggers.length}):`, JSON.stringify(triggers));

        // Actual Run Checking
        for (const trigger of triggers) {
            let match = false;
            if (trigger.type === 'minutes') {
                const mins = parseInt(trigger.value);
                match = (mins > 0 && brM % mins === 0);
            } else if (trigger.type === 'hours') {
                const hrs = parseInt(trigger.value);
                match = (hrs > 0 && brH % hrs === 0 && brM === 0);
            } else if (trigger.type === 'days') {
                match = (trigger.value === brTime);
            } else if (trigger.type === 'cron') {
                match = matchesCron(trigger.value);
            }
            log(`    Trigger [${trigger.type}] val='${trigger.value}' -> Match: ${match}`);
        }

        log('\n  --- Simulation Tests ---');
        const testTimes = [
            { h: 11, m: 0 }, { h: 15, m: 0 }, { h: 16, m: 0 }, { h: 18, m: 0 }, { h: 21, m: 0 }
        ];
        for (const t of testTimes) {
            const matches = checkTriggers(triggers, t.h, t.m);
            log(`  Time ${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')} -> Matches: ${matches.join(', ') || 'None'}`);
        }
    }
    
    fs.writeFileSync('debug_scheduler.log', logOutput);
    log('\n✅ Diagnostics written to debug_scheduler.log');
}

main().catch(console.error).finally(() => prisma.$disconnect());
