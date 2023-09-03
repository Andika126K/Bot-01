const {
  default: makeWASocket,
  useMultiFileAuthState,
  extractMessageContent,
  downloadMediaMessage,
  delay,
  proto
} = require("@whiskeysockets/baileys")
const pino = require("pino")
const fetch = require("node-fetch")
const libphonenumber = require("libphonenumber")
const chalk = require("chalk")
const fs = require("fs")

const {
  prefix,
  owner
} = require("./config")

const plugins = fs.readdirSync(__dirname + "/plugins")
  .filter(v => v.endsWith(".js") && !v.startsWith("."))
  .map(v => ({ filename: v, ...require("./plugins/" + v) }))

/**
 * Buat jalanin bot
 * @param {String} mobile masukkan no hp kalo mau pake pairing code/input kode yg tanpa scan
 */
async function bot(mobile) {
  const auth = await useMultiFileAuthState("session")
  const socket = makeWASocket({
    printQRInTerminal: !mobile,
    browser: ["sibay", "Firefox", "1.0.0"],
    auth: auth.state,
    logger: pino({ level: "silent" })
  })
  if(mobile && !socket.authState?.creds?.registered) {
    //mobile = libphonenumber.e164(mobile).slice(1)
    //console.log(mobile)
    await delay(1500)
    const code = await socket.requestPairingCode(mobile)
    console.log(`Pairing code: ${chalk.black.bgGreenBright(code)}`)
  } else mobile = false

  socket.ev.on("creds.update", auth.saveCreds)
  socket.ev.on("connection.update", async({ connection, lastDisconnect }) => {
    if(connection === "open") {
      console.log("Sudah terhubung......🕑")
    }
    console.log(lastDisconnect)
    if(connection === "close") {
      await bot()
    }
  })

  socket.ev.on("messages.upsert", async({ type, messages }) => {
    if(type !== "notify") return

    for(let msg of messages) {
      simple(socket, msg)

      console.log(msg)

      if(!prefix.test(msg.text)) return
      if(msg.isBaileys) return

      const is = {
        owner: owner.find(([jid]) => jid === msg.sender),
        group: msg.chat.endsWith("@g.us"),
        personal: msg.chat.endsWith("@s.whatsapp.net")
      }

      let [cmd, ...args] = msg.text.split(" ")
      cmd = cmd.replace(prefix, "")
      const _cmd = plugins.find(v => v.data.name === cmd || v.data.alias?.includes(cmd))
      if(!_cmd) return
      if(_cmd.data.permissions?.owner && !is.owner) return
      if(_cmd.data.permissions?.group && !is.group) return await msg.reply("Perintah ini hanya dapat digunakan di grup")
      if(_cmd.data.permissions?.personal && !is.personal) return await msg.reply("Perintah ini hanya dapat digunakan di pm(Personal Message)")

      try {
        await _cmd.cb(msg, {
          client: socket,
          args,
          text: args.join(" "),
          is
        })
      } catch(e) {
        await msg.reply("Error!")
        console.error(e)
      }
    }
  })
}

/**
 * @param {makeWASocket} client
 * @param {proto.IWebMessageInfo} msg
 */
function simple(client, msg) {
  Object.defineProperties(msg, {
    mtype: {
      get() {
        return Object.keys(msg.message).find(v => v.endsWith("Message") || v === "conversation")
      },
      enumerable: true
    },
    msg: {
      get() {
        console.log(msg.mtype)
        return msg.message[msg.mtype]
      },
      enumerable: false
    },
    text: {
      get() {
        return msg.msg.text || msg.msg.caption
      }
    },
    reply: {
      async value(text) {
        return await client.sendMessage(msg.chat, { text: text }, { quoted: msg })
      }
    },
    chat: {
      get() {
        return msg.key?.remoteJid
      }
    },
    sender: {
      get() {
        return msg.key?.participant || msg.chat
      }
    },
    isBaileys: {
      get() {
        return msg.key?.id?.startsWith("BAE5") && msg.key?.id?.length === 16
      }
    },
    download: {
      async value() {
        return await downloadMediaMessage(msg, "buffer")
      }
    }
  })
}

bot()
