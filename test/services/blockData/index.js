import fs from 'fs'
import path from 'path'
const blocks = []

const dir = path.resolve(__dirname)
let files = fs.readdirSync(dir).filter(f => /^block-([0-9])+\.json$/.test(f))
files.forEach(file => {
  let content = fs.readFileSync(`${dir}/${file}`)
  blocks.push(JSON.parse(content.toString()))
})

export default blocks
