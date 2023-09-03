const fs = require("fs")

const data = {
  name: "menu"
}

async function cb(msg) {
  const all = fs.readdirSync(__dirname)
    .filter(v => v.endsWith(".js") && !v.startsWith("."))
    .map(v => ({ filename: v, ...require("./" + v) }))
  let tags = {}
  for(const i of all) {
    const tag = i.filename.split("-")[0]
    if(!(tag in tags)) tags[tag] = []
    tags[tag].push(i)
  }
  tags = Object.fromEntries(Object.entries(tags).sort((a, b) => a[0].charCodeAt(0) - b[0].charCodeAt(0)))
  for(const tag in tags) {
    tags[tag]
      .sort((a, b) => a.filename.split("-").slice(1).join("-").slice(0, -3).charCodeAt(0) - b.filename.split("-").slice(1).join("-").slice(0, -3).charCodeAt(0))
  }
  let str = "               *⟨[ Zeonal Bot ]⟩*               \n\n"
  for(const tag in tags) {
    str += `          *⟨[ ${tag[0].toUpperCase() + tag.slice(1).toLowerCase()} ]⟩*`
    for(const cmd of tags[tag]) {
      str += `\n • ${cmd.data.name}\n`
    }
    str += "\n\n"
  }

  await msg.reply(str.trimEnd())
}

module.exports = {
  data,
  cb
}
