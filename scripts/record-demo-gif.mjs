import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
import gifenc from 'gifenc'
const { GIFEncoder, quantize, applyPalette } = gifenc
import { PNG } from 'pngjs'

const [url, out] = process.argv.slice(2)
const FPS = 12

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 760, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light' })
await page.goto(url)

// Headless screenshots have no cursor, so draw one that follows the mouse.
await page.addStyleTag({
  content: `#fake-cursor{position:fixed;z-index:99999;width:18px;height:18px;pointer-events:none;left:-50px;top:-50px;
    background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M4 2l16 9-7 2-3 7z' fill='black' stroke='white' stroke-width='1.5' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat;
    transition:transform .08s}#fake-cursor.down{transform:scale(.8)}`,
})
await page.evaluate(() => {
  const c = document.createElement('div')
  c.id = 'fake-cursor'
  document.body.appendChild(c)
  addEventListener('mousemove', e => { c.style.left = e.clientX - 3 + 'px'; c.style.top = e.clientY - 2 + 'px' })
  addEventListener('mousedown', () => c.classList.add('down'))
  addEventListener('mouseup', () => c.classList.remove('down'))
})

const section = page.locator('section').first()
await section.scrollIntoViewIfNeeded()
const box = await section.boundingBox()
const clip = { x: 0, y: Math.max(0, box.y - 16), width: 760, height: Math.round(box.height + 24) }

const frames = []
let recording = true
const recorder = (async () => {
  while (recording) {
    const started = Date.now()
    frames.push({ png: await page.screenshot({ clip }), at: started })
    const wait = 1000 / FPS - (Date.now() - started)
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
  }
})()

const sleep = ms => page.waitForTimeout(ms)
const moveTo = async locator => {
  const b = await locator.boundingBox()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 14 })
}
const click = async locator => {
  await moveTo(locator)
  await sleep(250)
  await page.mouse.down()
  await sleep(90)
  await page.mouse.up()
}

const gotIt = page.getByRole('button', { name: 'Got it' })

await page.mouse.move(380, clip.y + 330)
await sleep(2200)
await click(gotIt)
await sleep(2200)
await click(gotIt)
await sleep(1200)
await click(page.getByRole('button', { name: 'Toggle sidebar' }))
await sleep(2300)
await click(gotIt)
await sleep(1500)

recording = false
await recorder
await browser.close()

const gif = GIFEncoder()
frames.forEach((frame, i) => {
  const { data, width, height } = PNG.sync.read(frame.png)
  const palette = quantize(data, 128)
  const next = frames[i + 1]
  const delay = next ? next.at - frame.at : 1500
  gif.writeFrame(applyPalette(data, palette), width, height, { palette, delay })
})
for (const i of [20, 45, 70, 105]) if (frames[i]) writeFileSync(out.replace('.gif', '-' + i + '.png'), frames[i].png)
gif.finish()
writeFileSync(out, gif.bytes())
console.log(`${frames.length} frames, ${(gif.bytes().length / 1024).toFixed(0)} KB, ${clip.width}x${clip.height}`)
