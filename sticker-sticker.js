const fetch = require("node-fetch")
const { FormData, Blob } = require("formdata-node")
const { fromBuffer } = require("file-type")
const webp = require("node-webpmux")
const { Readable } = require("stream")
const { promises } = require("fs")
const { join } = require("path")
const { spawn } = require("child_process")

function ffmpeg(buffer, args = [], ext = "", ext2 = "") {
  return new Promise(async (resolve, reject) => {
    try {
      let tmp = join(__dirname, "../tmp", + new Date + "." + ext)
      let out = tmp + "." + ext2
      await promises.writeFile(tmp, buffer)
      spawn("ffmpeg", [
        "-y",
        "-i", tmp,
        ...args,
        out
      ])
        .on("error", reject)
        .on("close", async (code) => {
          try {
            await promises.unlink(tmp)
            if (code !== 0) return reject(code)
            resolve({
              data: await promises.readFile(out),
              filename: out,
              delete() {
                return promises.unlink(out)
              }
            })
          } catch (e) {
            reject(e)
          }
        })
    } catch (e) {
      reject(e)
    }
  })
}

const fileIO = async buffer => {
  const { ext, mime } = await fromBuffer(buffer) || {}
  let form = new FormData()
  const blob = new Blob([buffer.toArrayBuffer()], { type: mime })
  form.append("file", blob, "tmp." + ext)
  let res = await fetch("https://file.io/?expires=1d", {
    method: "POST",
    body: form
  })
  let json = await res.json()
  if (!json.success) throw json
  return json.link
}

const RESTfulAPI = async inp => {
  let form = new FormData()
  let buffers = inp
  if (!Array.isArray(inp)) buffers = [inp]
  for (let buffer of buffers) {
    const blob = new Blob([buffer.toArrayBuffer()])
    form.append("file", blob)
  }
  let res = await fetch("https://storage.restfulapi.my.id/upload", {
    method: "POST",
    body: form
  })
  let json = await res.text()
  try {
    json = JSON.parse(json)
    if (!Array.isArray(inp)) return json.files[0].url
    return json.files.map(res => res.url)
  } catch (e) {
    throw json
  }
}

async function uploadImage(inp) {
  let err = false
  for (let upload of [RESTfulAPI, fileIO]) {
    try {
      return await upload(inp)
    } catch (e) {
      err = e
    }
  }
  if (err) throw err
}


async function addExif(webpSticker, packname, author, categories = [""], extra = {}) {
  const img = new webp.Image();
  const stickerPackId = crypto.randomBytes(32).toString("hex");
  const plink = "https://play.google.com/store/apps/details?id=com.snowcorp.stickerly.android";
  const alink = "https://itunes.apple.com/app/sticker-maker-studio/id1443326857";
  const json = { "sticker-pack-id": stickerPackId, "sticker-pack-name": packname, "sticker-pack-publisher": author, "android-app-store-link": plink, "Ios-app-store-link": alink, "emojis": categories, ...extra };
  let exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
  let jsonBuffer = Buffer.from(JSON.stringify(json), "utf8");
  let exif = Buffer.concat([exifAttr, jsonBuffer]);
  exif.writeUIntLE(jsonBuffer.length, 14, 4);
  await img.load(webpSticker)
  img.exif = exif
  return await img.save(null)
}

async function sticker(img, url, ...args) {
  if(url) {
    let res = await fetch(url)
    if(res.status !== 200) throw await res.text()

    img = await res.buffer()
  }

   const sticker = await ffmpeg(img, [
    "-vf",
    "scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1"
  ], "jpeg", "webp")
  const res = await addExif(sticker.data, ...args, ["🤖"])
  sticker.delete()

  return res
}

const data = {
  name: "sticker",
  alias: ["s"]
}

async function cb(msg, { client, text }) {
  if(msg.mtype !== "imageMessage") return await msg.reply("Kirim gambar dengan caption *.s*")

  await msg.reply("Silahkan tunggu!")
  let [packname, ...author] = text.split("|")
  if(!packname && !author[0]) {
    const dte = new Date()
    const YYYY = dte.getFullYear()
    const MM = ((dte.getMonth() + 1) + "").padStart(2, "0")
    const DD = (dte.getDate() + "").padStart(2, "0")
    const date = [YYYY, MM, DD].join("-");
    [packname, ...author] = [date, "zeonal bot"]
  }

  const stc = await sticker(await msg.download(), null, packname, author.join("|"))
  await conn.sendMessage(msg.chat, {
    sticker: stc
  }, {
    quoted: msg
  })
}
module.exports = {
  data,
  cb
}
