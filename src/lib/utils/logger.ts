import fs from 'node:fs'
import path from 'node:path'

export const filePrint = (msg: string, ...rest: string[]) => {
  const line = `[${new Date().toISOString()}] ${msg} ${rest.join(' ')}\n`

  const dir = path.join(process.cwd(), 'src', 'logs')
  const file = path.join(dir, 'dev.log')

  try {
    fs.mkdirSync(dir, { recursive: true })
    fs.appendFileSync(file, line)
  } catch (e) {
    console.log('LOG(write-failed):', line)
  }

  console.log(msg, ...rest)
}