/**
 * 该文件是用来扩展 markdown-it 的官方插件 markdown-it-container 来实现 vitepress 中的 tip 那种格式的
 */

import MarkdownIt from 'markdown-it'
// 引入 markdown 的渲染规则，然后方便做扩展
import { RenderRule } from 'markdown-it/lib/renderer'
import Token from 'markdown-it/lib/token'
// 引入 markdown-it 的官方插件 markdown-it-container
import container from 'markdown-it-container'

export const containerPlugin = (md: MarkdownIt) => {
  // 这是 vitepress 扩展后的 container 代码: 
  // 官网链接: https://vitepress.vuejs.org/guide/markdown#custom-containers
  md.use(...createContainer('tip', 'TIP', md))
    .use(...createContainer('info', 'INFO', md))
    .use(...createContainer('warning', 'WARNING', md))
    .use(...createContainer('danger', 'DANGER', md))
    .use(...createContainer('details', 'Details', md))
    // explicitly escape Vue syntax 对 vue 语法的处理
    .use(container, 'v-pre', {
      render: (tokens: Token[], idx: number) =>
        tokens[idx].nesting === 1 ? `<div v-pre>\n` : `</div>\n`
    })
}

type ContainerArgs = [typeof container, string, { render: RenderRule }]

function createContainer(
  klass: string,
  defaultTitle: string,
  md: MarkdownIt
): ContainerArgs {
  // 返回的是 markdown-it-container 的官方要求的扩展格式
  return [
    container,
    klass,
    {
      render(tokens, idx) {
        const token = tokens[idx]
        const info = token.info.trim().slice(klass.length).trim()
        // token.nesting === 1 说明是开始标签，结束标签的 token.nesting 是 -1
        if (token.nesting === 1) {
          const title = md.renderInline(info || defaultTitle)
          // vitepress 中对 details 的处理
          if (klass === 'details') {
            return `<details class="${klass} custom-block"><summary>${title}</summary>\n`
          }
          return `<div class="${klass} custom-block"><p class="custom-block-title">${title}</p>\n`
        } else {
          return klass === 'details' ? `</details>\n` : `</div>\n`
        }
      }
    }
  ]
}
