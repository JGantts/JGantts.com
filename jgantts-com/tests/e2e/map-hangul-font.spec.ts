import { expect, test } from '@playwright/test'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

test('canvas keeps accented Hangul in the bundled font and Latin in Noto', async ({ page }, testInfo) => {
  await page.route('**/hangul-font-test', r => r.fulfill({ contentType: 'text/html', body: '<body style="background:#123"></body>' }))
  await page.goto('/hangul-font-test')
  const result = await page.evaluate(async styles => {
    for (const style of styles) await import(/* @vite-ignore */ style)
    const { townFonts, annotationFonts, loadTownLabelFonts } = await import(/* @vite-ignore */ '/src/views/kovyalo/maps/' + 'townLabels.ts')
    const sample = '떼́로́쌰뽀́'
    await loadTownLabelFonts(sample + 'Díe')
    const canvas = document.createElement('canvas')
    canvas.width = 700; canvas.height = 100
    const ctx = canvas.getContext('2d')!
    const stack = (fonts: string[]) => fonts.map(f => `"${f}"`).join(',')
    function pixels(font: string, text = sample) {
      ctx.clearRect(0, 0, 700, 100); ctx.font = font; ctx.fillText(text, 10, 70)
      return JSON.stringify([...ctx.getImageData(0, 0, 700, 100).data])
    }
    const patched = [pixels('400 48px "JGantts Hangul Serif"'), pixels('300 48px "JGantts Hangul Sans"')]
    const matches = [townFonts, annotationFonts].map((fonts, i) => pixels(`${i ? 300 : 400} 48px ${stack(fonts)}`) === patched[i])
    const latinUnchanged = pixels(`400 48px ${stack(townFonts)}`, 'Díe') === pixels('400 48px "Noto Serif"', 'Díe')
    const { renderTownLabel } = await import(/* @vite-ignore */ '/src/views/kovyalo/maps/' + 'rubyLabels.ts')
    const label = renderTownLabel([{ text: '떼́' }], 'díe\n떼́')
    canvas.width = label.image.width; canvas.height = label.image.height
    ctx.putImageData(label.image, 0, 0); canvas.style.width = `${canvas.width * 3}px`; document.body.append(canvas)
    return { matches, latinUnchanged, redundant: performance.getEntriesByType('resource').filter(r => /noto-(sans|serif)-kr-/.test(r.name)).length, downloaded: performance.getEntriesByType('resource').filter(r => /JGanttsHangul(Serif-Regular|Sans-Light).*\.woff2/.test(r.name)).length === 2 }
  }, ['/src/assets/fonts/hangul.css', ...['@fontsource/noto-serif/400.css', '@fontsource/noto-sans/300.css', '@fontsource/noto-serif-kr/400.css', '@fontsource/noto-sans-kr/300.css'].map(p => `/@fs${require.resolve(p)}`)])
  expect(result).toEqual({ matches: [true, true], latinUnchanged: true, redundant: 0, downloaded: true })
  // Chinese still loads its CJK fallback on demand after the Hangul-only case.
  const chineseLoaded = await page.evaluate(async () => {
    const { loadTownLabelFonts } = await import(/* @vite-ignore */ '/src/views/kovyalo/maps/' + 'townLabels.ts')
    await loadTownLabelFonts('餉')
    return ['serif', 'sans'].every(style => performance.getEntriesByType('resource')
      .some(r => r.name.includes(`noto-${style}-kr-`) && r.name.endsWith('.woff2')))
  })
  expect(chineseLoaded).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('hangul-label.png') })
})
