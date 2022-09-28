/**
 * 该文件只对 显示高亮的 attrs 进行规范化处理，其他处理在 ./highlight.ts 文件里面
 */


// Modified from https://github.com/egoist/markdown-it-highlight-lines
// Now this plugin is only used to normalize line attrs.
// The else part of line highlights logic is in './highlight.ts'.

import MarkdownIt from 'markdown-it'

const RE = /{([\d,-]+)}/

// 对 attrs 进行规范化处理：
export const highlightLinePlugin = (md: MarkdownIt) => {
  // markdown-it 中对代码块的处理，取出进行扩展
  const fence = md.renderer.rules.fence!
  // 对 fence 进行扩展：
  md.renderer.rules.fence = (...args) => {
    const [tokens, idx] = args
    // 拿到当前 token
    const token = tokens[idx]

    // due to use of markdown-it-attrs, the {0} syntax would have been
    // converted to attrs on the token
    const attr = token.attrs && token.attrs[0]

    let lines = null

    if (!attr) {
      // markdown-it-attrs maybe disabled
      const rawInfo = token.info

      if (!rawInfo || !RE.test(rawInfo)) {
        return fence(...args)
      }

      const langName = rawInfo.replace(RE, '').trim()

      // ensure the next plugin get the correct lang
      token.info = langName

      lines = RE.exec(rawInfo)![1]
    }

    if (!lines) {
      lines = attr![0]

      if (!lines || !/[\d,-]+/.test(lines)) {
        return fence(...args)
      }
    }

    token.info += ' ' + lines
    return fence(...args)
  }
}
