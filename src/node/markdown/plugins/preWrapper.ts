// TODO: 当前理解为添加代码块右上角的 copy按钮和代码语言标识 其他功能暂不了解

// markdown-it plugin for wrapping <pre> ... </pre>.
//
// If your plugin was chained before preWrapper, you can add additional element directly.
// If your plugin was chained after preWrapper, you can use these slots:
//   1. <!--beforebegin-->
//   2. <!--afterbegin-->
//   3. <!--beforeend-->
//   4. <!--afterend-->

import MarkdownIt from 'markdown-it'

export const preWrapperPlugin = (md: MarkdownIt) => {
  const fence = md.renderer.rules.fence!
  md.renderer.rules.fence = (...args) => {
    const [tokens, idx] = args
    const lang = tokens[idx].info.trim().replace(/-vue$/, '')
    const rawCode = fence(...args)
    // <button class="copy"></button> 是代码块中右上角的 copy 按钮，
    // <span class="lang">${ lang === 'vue-html' ? 'template' : lang }</span> 是代码块中右上角的 代码语言 标识
    // rawCode 是真正的 代码块中的代码
    return `<div class="language-${lang}"><button class="copy"></button><span class="lang">${
      lang === 'vue-html' ? 'template' : lang
    }</span>${rawCode}</div>`
  }
}
