/**
 * 这里是 vitepress 对语言高亮的处理
 */


// shiki.js 是一个用来语法高亮的库(),官方文档: https://shiki.matsu.io/
// 语言列表也是 shiki 提供的, 包含以下语言: https://github.com/shikijs/shiki/blob/main/docs/languages.md
// vitepress 官方文档也说是用的 shiki 这个库: https://vitepress.vuejs.org/guide/markdown#syntax-highlighting-in-code-blocks
import { IThemeRegistration, getHighlighter, HtmlRendererOptions } from 'shiki'
import type { ThemeOptions } from '../markdown'

/**
 * 2 steps:
 *
 * 1. convert attrs into line numbers: 将后面的属性转换为行号，官方文档：https://vitepress.vuejs.org/guide/markdown#line-highlighting-in-code-blocks
 *    {4,7-13,16,23-27,40} -> [4,7,8,9,10,11,12,13,16,23,24,25,26,27,40]
 * 2. convert line numbers into line options:
 *    [{ line: number, classes: string[] }]
 */
// 将 {4,7-13,16,23-27,40} -> [4,7,8,9,10,11,12,13,16,23,24,25,26,27,40] 这种转化
const attrsToLines = (attrs: string): HtmlRendererOptions['lineOptions'] => {
  const result: number[] = []
  if (!attrs.trim()) {
    return []
  }
  attrs
    .split(',')
    .map((v) => v.split('-').map((v) => parseInt(v, 10)))
    .forEach(([start, end]) => {
      if (start && end) {
        result.push(
          // Array.from 的第二个参数是一个函数，是前面类数组中每一个元素和下标
          ...Array.from({ length: end - start + 1 }, (_, i) => start + i)
        )
      } else {
        result.push(start)
      }
    })
  return result.map((v) => ({
    line: v,
    classes: ['highlighted']
  }))
}

export async function highlight(
  // 默认高亮主题: 'material-palenight'
  theme: ThemeOptions = 'material-palenight'
): Promise<(str: string, lang: string, attrs: string) => string> {
  const hasSingleTheme = typeof theme === 'string' || 'name' in theme
  const getThemeName = (themeValue: IThemeRegistration) =>
    typeof themeValue === 'string' ? themeValue : themeValue.name

  const highlighter = await getHighlighter({
    themes: hasSingleTheme ? [theme] : [theme.dark, theme.light]
  })
  const preRE = /^<pre.*?>/
  const vueRE = /-vue$/

  return (str: string, lang: string, attrs: string) => {
    const vPre = vueRE.test(lang) ? '' : 'v-pre'
    lang = lang.replace(vueRE, '').toLowerCase()

    // 将 {4,7-13,16,23-27,40} 转化为 [4,7,8,9,10,11,12,13,16,23,24,25,26,27,40] 这种格式
    const lineOptions = attrsToLines(attrs)

    if (hasSingleTheme) {
      return highlighter
        .codeToHtml(str, { lang, lineOptions, theme: getThemeName(theme) })
        .replace(preRE, `<pre ${vPre}>`)
    }

    const dark = highlighter
      .codeToHtml(str, { lang, lineOptions, theme: getThemeName(theme.dark) })
      .replace(preRE, `<pre ${vPre} class="vp-code-dark">`)

    const light = highlighter
      .codeToHtml(str, { lang, lineOptions, theme: getThemeName(theme.light) })
      .replace(preRE, `<pre ${vPre} class="vp-code-light">`)

    return dark + light
  }
}
