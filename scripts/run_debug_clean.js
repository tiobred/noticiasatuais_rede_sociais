const { spawn } = require('child_process');
const fs = require('fs');

const logStream = fs.createWriteStream('debug_reels_clean.log');

const child = spawn('npx', ['ts-node', '--project', 'tsconfig.scripts.json', 'scripts/debug-reels.ts'], {
    shell: true,
    cwd: 'c:\\Users\\Anderson\\noticias_redes_sociais\\noticiasatuais_rede_sociais'
});

child.stdout.on('data', (data) => {
    process.stdout.write(data);
    logStream.write(data);
});

child.stderr.on('data', (data) => {
    process.stderr.write(data);
    logStream.write(data);
});

child.on('close', (code) => {
    console.log(`Child process exited with code ${code}`);
    logStream.end();
});
