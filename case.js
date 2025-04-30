const axios = require('axios');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { exec } = require("child_process");
const util = require('util');
const moment = require('moment');
const vreden = require('@vreden/meta');
const config = require('./config.js');
const prefixes = config.prefix;
const ppbot = config.ppbot;
const botname = config.botname;
const creatorJid = config.ownerNumber + "@s.whatsapp.net";


let startTime = moment();
/*
const prefixes = ['.', '!', '?', '#']; // Multi Prefix
const ppbot = 'https://files.catbox.moe/17fwbi.jpg';
const botname = 'PolyMD MAIN BOT';
const creatorJid = '6287745835962@s.whatsapp.net'; */

// Fungsi untuk menangani pesan
async function handleMessages(sock, message, botId) {
  try {
    const msg = message.messages[0];
    const from = msg.key.remoteJid;
    let messageContent = '';

    if (msg.key.fromMe) return;

    const senderJid = msg.key.participant || from;
    const senderNumber = senderJid.split('@')[0];
    const pushname = msg.pushName || "Tanpa Nama";
    const isGroup = from.endsWith('@g.us');
    const chatType = isGroup ? "Grup" : "Privat";

   
    if (msg.message.conversation) {
      messageContent = msg.message.conversation;
    } else if (msg.message.extendedTextMessage) {
      messageContent = msg.message.extendedTextMessage.text;
    } else {
      console.log('Tipe pesan tidak dikenali:', msg.message);
      return;
    }

    let m = {
      ...msg,
      isButton: !!msg.message?.buttonsResponseMessage,
      buttonId: msg.message?.buttonsResponseMessage?.selectedButtonId || '',
      buttonText: msg.message?.buttonsResponseMessage?.selectedDisplayText || '',
      isText: !!msg.message?.conversation || !!msg.message?.extendedTextMessage,
      text: msg.message?.conversation || msg.message?.extendedTextMessage?.text || '',
      isImage: !!msg.message?.imageMessage,
      imageData: msg.message?.imageMessage ? {
          url: msg.message.imageMessage.url || null,
          mimetype: msg.message.imageMessage.mimetype || null,
          caption: msg.message.imageMessage.caption || '',
          directPath: msg.message.imageMessage.directPath || null,
          jpegThumbnail: msg.message.imageMessage.jpegThumbnail || null
      } : null,
      quoted: msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || msg.message?.buttonsResponseMessage?.contextInfo?.quotedMessage || null
  };
  
  // **Jika pesan berasal dari tombol, ubah teks menjadi buttonId agar bisa dikenali sebagai perintah**
  if (m.isButton && m.buttonId) {
      m.text = m.buttonId;
  }

    console.log(`> Pesan dari: ${pushname}\nSenderNumber: (${senderNumber})\n| Tipe Chat: ${chatType} |\nIsi: ${messageContent}\nTombol: ${m.isButton ? m.buttonText : "Bukan tombol"}\n SUBS POLYMD!`);

    // Cek apakah pesan menggunakan prefix yang valid
    const usedPrefix = prefixes.find(p => messageContent.startsWith(p));
    if (!usedPrefix && !messageContent.startsWith('>')) return;

    // Ambil command tanpa prefix
    const args = messageContent.slice(usedPrefix ? usedPrefix.length : 0).trim().split(' ');
    const command = args.shift().toLowerCase();
    const text = args.join(' ');

    async function urlToSticker(sock, message, url, from) {
      try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data);

        const stickerBuffer = await sharp(imageBuffer)
          .resize(512, 512, { fit: 'contain' })
          .webp({ quality: 80 })
          .toBuffer();

        const tempStickerPath = path.join(process.cwd(), 'temp.webp');
        await fs.promises.writeFile(tempStickerPath, stickerBuffer);

        await sock.sendMessage(from, { sticker: { url: tempStickerPath } }, { quoted: m });

        await fs.promises.unlink(tempStickerPath);
      } catch (err) {
        console.error('Error converting image to sticker:', err);
      }
    }

    const runtime = moment.duration(moment().diff(startTime));
    const uptime = moment.duration(moment().diff(startTime));

    const { proto, generateWAMessageFromContent } = require("@whiskeysockets/baileys");

    //await 
    async function wait(sock, from, m) {
      const loadingMessages = ["L", "Lo", "Loa", "Load", "Loadi", "Loadin", "Loading", "Success"];
      let sentMessage;
  
      for (let i = 0; i < loadingMessages.length; i++) {
          if (i === 0) {
              sentMessage = await sock.sendMessage(from, { text: loadingMessages[i] }, { quoted: m });
          } else {
              await new Promise(resolve => setTimeout(resolve, 300)); // Delay animasi 300ms
              await sock.sendMessage(from, { edit: sentMessage.key, text: loadingMessages[i] });
          }
      }
  }
  

    switch (command) {
      case 'menu':
    await wait(sock, from, m);

    if (config.useButtonMenu) {
        const buttons = [
            { buttonId: `${prefixes[0]}ping`, buttonText: { displayText: "📶 Ping" }, type: 1 },
            { buttonId: `${prefixes[0]}owner`, buttonText: { displayText: "👤 Owner" }, type: 1 },
            { buttonId: `${prefixes[0]}tiktok`, buttonText: { displayText: "🎥 Download TikTok" }, type: 1 }
        ];

        await sock.sendMessage(from, {
            text: `📜 *Menu Bot*\n\nSilakan pilih fitur di bawah:`,
            footer: botname,
            buttons: buttons,
            headerType: 1,
            contextInfo: {
                externalAdReply: {
                    showAdAttribution: true,
                    title: botname,
                    body: "Pilih opsi di bawah",
                    thumbnailUrl: config.ppbot,
                    sourceUrl: config.website,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m });

    } else {
        await sock.sendMessage(from, {
          video: { url: 'https://files.catbox.moe/46b4oq.mp4' },
        gifPlayback: true,
            caption: `📜 *Menu Bot*\n\n1. 📶 *Ping*: ${prefixes[0]}ping\n2. 👤 *Owner*: ${prefixes[0]}owner\n3. 🎥 *Download TikTok*: ${prefixes[0]}tiktok\n4. 📸 *Membuat Sticker Text*: ${prefixes[0]}brat\n5. 📸 *Mendownload Audio Youtube*: ${prefixes[0]}play\n6. *Kembali Ke Awal* ${prefixes[0]}menu`,
            contextInfo: {
                externalAdReply: {
                    showAdAttribution: true,
                    title: botname,
                    body: "Pilih opsi di bawah",
                    thumbnailUrl: config.ppbot,
                    sourceUrl: config.website,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m });
    }
    break;


      /*
      case 'menu':
        await wait(sock, from, m)
    await sock.sendMessage(from, {
        video: { url: 'https://files.catbox.moe/46b4oq.mp4' },
        gifPlayback: true,
        caption: `📜 *Menu Bot*\n\nPilih fitur di bawah:`,
        contextInfo: {
            externalAdReply: {
                showAdAttribution: true,
                title: botname,
                body: "Pilih opsi di bawah",
                thumbnailUrl: ppbot,
                sourceUrl: "https://polytesting.com",
                mediaType: 1,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: m });
    break;

      
      case 'menu':
        sock.sendMessage(from, {
          text: '📜 *Menu belum tersedia*\n',
          contextInfo: {
            externalAdReply: {
              title: `Status Bot`,
              body: `${uptime.hours()} jam ${uptime.minutes()} menit ${uptime.seconds()} detik.`,
              thumbnail: null,
              mediaType: 1,
              renderLargerThumbnail: true,
              sourceUrl: `https://${botname}`,
            },
            mentionedJid: [from],
          }
        }, { quoted: m });
        break; */

        case 'owner':
    await sock.sendMessage(from, {
        contacts: {
            displayName: config.ownerName,
            contacts: [{
                vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${config.ownerName}\nTEL;waid=${config.ownerNumber}:${config.ownerNumber}\nORG:${botname}\nURL:${config.website}\nEND:VCARD`
            }]
        },
        contextInfo: {
            externalAdReply: {
                title: `Owner ${botname}`,
                body: "Hubungi owner untuk informasi lebih lanjut",
                thumbnailUrl: ppbot,
                sourceUrl: config.website,
                mediaType: 1,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: m });
    break;


      case 'brat':
      case 'anomali':
        if (!text) return sock.sendMessage(from, { text: `Contoh: ${usedPrefix}brat hai` }, { quoted: m });
        const url = `https://brat.caliphdev.com/api/brat?text=${text}`;
        await urlToSticker(sock, message, url, from);
        break;

      case 'sticker':
        if (!msg.message.imageMessage) return sock.sendMessage(from, { text: `Kirim gambar dengan caption ${usedPrefix}sticker` }, { quoted: m });
        const imageBuffer = await sock.downloadMediaMessage(msg.message.imageMessage);
        const stickerBuffer = await sharp(imageBuffer)
          .resize(512, 512, { fit: 'contain' })
          .webp({ quality: 80 })
          .toBuffer();
        await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: m });
        break;

      //downloader
      case 'play':
    if (!text) return sock.sendMessage(from, { text: `Contoh: ${usedPrefix}play <judul lagu>` }, { quoted: m });

    await wait(sock, from, m); // Efek loading sebelum proses dimulai

    try {
        const response = await axios.get(`https://api.vreden.my.id/api/ytplaymp3?query=${encodeURIComponent(text)}`);
        const result = response.data.result;

        if (result && result.download && result.download.url) {
            await sock.sendMessage(from, {
                audio: { url: result.download.url },
                mimetype: 'audio/mpeg',
                fileName: `${result.metadata.title}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        showAdAttribution: true,
                        title: result.metadata.title,
                        body: `Duration: ${result.metadata.duration.timestamp} | Views: ${result.metadata.views.toLocaleString()}`,
                        thumbnailUrl: result.metadata.thumbnail,
                        sourceUrl: result.metadata.url,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m });
        } else {
            await sock.sendMessage(from, { text: '⚠️ Gagal mendapatkan lagu, coba judul lain.' }, { quoted: m });
        }
    } catch (error) {
        console.error('Error mengambil lagu:', error);
        await sock.sendMessage(from, { text: '❌ Terjadi kesalahan saat mengambil lagu.' }, { quoted: m });
    }
    break;

      case 'tiktok':
      case 'tt':
        if (!text) return sock.sendMessage(from, { text: `Contoh: ${usedPrefix}tiktok <url>` }, { quoted: m });
        sock.sendMessage(from, { text: `sabar ya kak ${pushname}!, video tiktok nya sedang di proses` }, { quoted: m });
        try {
          const response = await axios.get(`https://385ru5dpmxgji.ahost.marscode.site/download?url=${text}`);
          if (response.data.video_url) {
            await sock.sendMessage(from, {
              video: { url: response.data.video_url },
              caption: response.data.title + '\n' + '> note: jika Fitur ini work, Maka jaga lah supaya tidak error. PAHAM!',
              contextInfo: {
                externalAdReply: {
                  title: `Tiktok Downloader`,
                  body: `Download video TikTok tanpa watermark`,
                  thumbnailUrl: config.ppbot,
                  mediaType: 1,
                  renderLargerThumbnail: true,
                  sourceUrl: text,
                }
              }
            }, { quoted: m });
          } else {
            await sock.sendMessage(from, { text: 'Gagal mengambil video TikTok.' }, { quoted: m });
          }
        } catch (error) {
          console.error('Error mengambil video TikTok:', error);
          await sock.sendMessage(from, { text: 'Terjadi kesalahan saat mengambil video TikTok.' }, { quoted: m });
        }
        break;

      case 'ping':
        const pingResponse = `Pong! Bot sudah berjalan selama ${uptime.hours()} jam ${uptime.minutes()} menit ${uptime.seconds()} detik.`;
        await sock.sendMessage(from, {
          text: pingResponse,
          contextInfo: {
            externalAdReply: {
              title: `Status Bot`,
              body: `Cek status bot!`,
              thumbnailUrl: config.ppbot,
              mediaType: 1,
              renderLargerThumbnail: true,
              sourceUrl: `https://${botname}`,
            },
            mentionedJid: [from],
          }
        }, { quoted: m });
        break;

      default:
        if (messageContent.startsWith('>')) {
          if (senderJid !== creatorJid) return;
          try {
            let evalResult = await eval(messageContent.slice(1));
            if (typeof evalResult !== 'string') evalResult = require('util').inspect(evalResult);
            await sock.sendMessage(from, { text: evalResult }, { quoted: m });
          } catch (err) {
            await sock.sendMessage(from, { text: `❌ Error: ${String(err)}` }, { quoted: m });
          }
        }
        break;
    }
  } catch (error) {
    console.error('Error saat memproses pesan:', error);
  }
}

module.exports = { handleMessages };
