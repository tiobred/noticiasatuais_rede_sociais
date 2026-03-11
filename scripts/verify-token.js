const fs = require('fs');
require('dotenv').config();
const axios = require('axios');

async function main() {
    let output = '';
    const accounts = JSON.parse(process.env.INSTAGRAM_ACCOUNTS || '[]');
    for (const acc of accounts) {
        output += `Checking account: ${acc.id} (Config ID: ${acc.userId})\n`;
        try {
            const resp1 = await axios.get(`https://graph.facebook.com/v21.0/${acc.userId}`, {
                params: { fields: 'username,name,id', access_token: acc.accessToken }
            });
            output += `Targeted ID API response: ${JSON.stringify(resp1.data)}\n`;

            const resp2 = await axios.get(`https://graph.facebook.com/v21.0/me`, {
                params: { fields: 'id,name,instagram_business_account', access_token: acc.accessToken }
            });
            output += `Me API response: ${JSON.stringify(resp2.data)}\n`;
        } catch (e) {
            output += `Error for ${acc.id}: ${JSON.stringify(e.response?.data || e.message)}\n`;
        }
    }
    fs.writeFileSync('verify-result.json', output);
}

main();
