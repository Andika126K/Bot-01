const prefix = /^[./_]/

// [no, nama]
const owner = [
  ["6283121495921", "Andika"]
].map(([no, nama]) => [
  no.replace(/[^0-9]+/g, "") + "@s.whatsapp.net",
  nama
])

module.exports = {
  prefix,
  owner
}