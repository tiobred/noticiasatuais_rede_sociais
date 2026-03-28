import { getMergedConfigs } from '../lib/db/config-helper';

async function main() {
  const res = await getMergedConfigs('global', ['SCHEDULER_TRIGGERS']);
  console.log('Result of getMergedConfigs:', JSON.stringify(res, null, 2));
}

main().catch(console.error);
