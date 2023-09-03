const axios = require("axios")

const data = {
  name: "tiktok",
  alias: ["tt"]
}

async function cb(msg, { client, text }) {
  try {
    if(!text) return await msg.reply("URL nya?")

    await msg.reply("Silahkan tunggu!")
    const { data } = await axios.get("https://api.mrestu.my.id/tiktok?url=" + encodeURIComponent(text))
    await client.sendMessage(msg.chat, {
      video: {
        url: data.result.play
      },
      caption: data.result.title
    }, {
      quoted: msg
    })
  } catch {
    await msg.reply("Error!\n\nNote: error ini bukan dari bot tetapi error dari back-end api untuk download videonya")
  }
}

module.exports = {
  data,
  cb
}
