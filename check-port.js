/* eslint-disable @typescript-eslint/no-require-imports */
const net = require('net');
const client = new net.Socket();
client.setTimeout(2000);
client.on('connect', () => {
    console.log('Port 3306 is OPEN');
    client.destroy();
});
client.on('error', (err) => {
    console.log('Port 3306 is CLOSED:', err.message);
});
client.on('timeout', () => {
    console.log('Port 3306 TIMEOUT');
    client.destroy();
});
client.connect(3306, '127.0.0.1');
