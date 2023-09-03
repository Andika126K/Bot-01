const axios = require("axios")

const data = {
  name: "simi"
}

async function cb(msg, { text }) {
  if(!text) return await msg.reply("Teksnya?")

  const { data } = await axios.get("https://api.akuari.my.id/simi/simi2?query=" + encodeURIComponent(text))
  await msg.reply(data.respon || "*Tidak ada respon dari simi*")
}

module.exports = {
  data,
  cb
}
