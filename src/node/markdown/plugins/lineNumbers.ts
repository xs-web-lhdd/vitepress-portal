/**
 * 该 plugin 是为了生成代码框中的 行号用的
 * 依赖于 preWrapper 插件
 */

// markdown-it plugin for generating line numbers.
// It depends on preWrapper plugin.

import MarkdownIt from 'markdown-it'

export const lineNumberPlugin = (md: MarkdownIt) => {
  const fence = md.renderer.rules.fence!
  md.renderer.rules.fence = (...args) => {
    const rawCode = fence(...args)
    // 把代码中内容取出来
    const code = rawCode.slice(
      rawCode.indexOf('<code>'),
      rawCode.indexOf('</code>')
    )

    // 通过换行符分割：
    const lines = code.split('\n')
    const lineNumbersCode = [...Array(lines.length - 1)]
      .map((line, index) => `<span class="line-number">${index + 1}</span><br>`)
      .join('')

    const lineNumbersWrapperCode = `<div class="line-numbers-wrapper">${lineNumbersCode}</div>`

    const finalCode = rawCode
      .replace(/<\/div>$/, `${lineNumbersWrapperCode}</div>`)
      .replace(/"(language-[-\w]*)"/, '"$1 line-numbers-mode"')

    return finalCode
  }
}
