const fs = require('fs');
const readline = require('readline');
const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const colors = require('colors'); // Mengimpor colors untuk pewarnaan teks
const { handleMessages } = require('./case'); // Mengimpor fungsi handleMessages dari case.js
const pino = require('pino'); // Logger untuk mengatur level log


// Fungsi untuk memulai bot
async function startBot() {
    // Menampilkan pesan pembuka dengan warna
    console.log("======================================".brightBlue);
    console.log("Author: Lutfi".cyan);
    console.log("Rules:".brightCyan);
    console.log("1. Hanya gunakan bot ini untuk tujuan yang sah.".white);
    console.log("2. Bot ini tidak bertanggung jawab atas penyalahgunaan.".white);
    console.log("3. Jangan gunakan bot untuk spam atau tindakan merugikan lainnya.".white);
    console.log("======================================".brightBlue);

    // Menunggu input untuk melanjutkan menjalankan bot
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    /*
    rl.question('Masukkan key untuk menjalankan bot: '.grey, async (key) => {
        if (key === 'sc by lutfi') { // Key untuk menjalankan bot
            console.log('\nKey valid! Bot akan dimulai...'.brightGreen);
            rl.close();
            await startBotProcess();
        } else {
            console.log('\nKey tidak valid! Bot tidak dapat dijalankan.'.red);
            rl.close();
        }
    } ); */ await startBotProcess();
}

// Fungsi untuk memulai bot (utama)
async function startBotProcess() {
    // Mendapatkan versi terbaru dari Baileys
    const { version } = await fetchLatestBaileysVersion();
    console.log('Versi terbaru Baileys:'.brightCyan, version);

    // Menggunakan multi-file auth state untuk sesi
    const { state, saveCreds } = await useMultiFileAuthState('./');

    // Membuat logger yang membungkam log
    const logger = pino({ level: 'silent' });

    // Membuat socket untuk WhatsApp
    const sock = makeWASocket({
        auth: state, // Menggunakan sesi yang telah ada
        version,
        logger, // Logger disesuaikan untuk menghilangkan pesan
    });

    let botId;

    // Menyimpan kredensial secara berkala
    sock.ev.on('creds.update', saveCreds);

    // Menangani koneksi dan QR code
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
            console.log('Koneksi terputus, mencoba menyambung ulang:'.red, shouldReconnect);
            if (shouldReconnect) {
                startBot(); // Coba restart bot
            }
        } else if (connection === 'open') {
            console.log('\nBot berhasil terhubung ke WhatsApp!'.brightGreen);
            botId = sock.user.id; // Menyimpan ID bot setelah berhasil terhubung
        }
        if (qr) {
            console.log('\nSilakan scan QR code berikut:'.cyan);
            qrcode.generate(qr, { small: true }); // Menampilkan QR code di terminal
        }
    });

    // Mengirim pesan selamat datang ketika terhubung
    sock.ev.on('open', () => {
        console.log('\nBot sudah terhubung ke WhatsApp!'.brightGreen);
    });

    // Menangani pesan masuk
    sock.ev.on('messages.upsert', async (message) => {
        await handleMessages(sock, message, botId); // Mengirimkan ID bot agar dapat memeriksa pengirim pesan
    });
}

// Memulai bot
startBot();
