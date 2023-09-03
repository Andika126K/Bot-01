const data = {
  permissions: {
    owner: true
  },
  name: "Andika",
  alias: ["dikq"]
}

const { format } = require("util")
async function cb(msg, { text }) {
  try {
    await msg.reply(format(
      await eval(`(async() => { ${text}\n })()`)
    ))
  } catch(e) {
    await msg.reply(format(e))
  }
}

module.exports = {
  data,
  cb
}