// Render the code-native JG mark at the platform-required sizes.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../jgantts-com/PUBLIC/app-icons');
async function main() {
  const source = fs.readFileSync(path.join(root, 'mark.svg'));
  for (const [name, size] of [['icon-192', 192], ['icon-512', 512], ['apple-touch-icon', 180]]) {
    await sharp(source).resize(size, size).png().toFile(path.join(root, `${name}.png`));
  }
  // All foreground artwork sits within the maskable icon's central safe circle.
  const inset = await sharp(source).resize(320, 320).png().toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: '#355bb1' } })
    .composite([{ input: inset, left: 96, top: 96 }]).png().toFile(path.join(root, 'maskable-512.png'));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
