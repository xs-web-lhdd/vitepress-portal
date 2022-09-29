import MarkdownIt from 'markdown-it'
// markdown-it 的官方 plugin
import anchorPlugin from 'markdown-it-anchor'
import attrsPlugin from 'markdown-it-attrs'
import emojiPlugin from 'markdown-it-emoji'


// mdit-vue 的插件集合:

/*  一个markdown-it插件，允许在 markdown 中使用 Vue 组件:
 *  将vue内置组件和未知的 HTML 标签视为 vue 组件（markdown - 默认情况下会将它们视为内联标签）。
 *  允许原生 HTML 标签上的vue@指令。
*/
import { componentPlugin } from '@mdit-vue/plugin-component'

/**
 * 一个markdown-it插件，用于获取 markdown frontmatter 和gray-matter:
 * 将 frontmatter 提取到 markdown-itenv.frontmatter中。
 * 允许通过 markdown-it 提供默认的 frontmatter env.frontmatter。
 * 将没有 frontmatter 的 markdown 内容提取到 markdown-itenv.content中。
 * 支持将渲染的摘录提取到 markdown-itenv.excerpt中。
 */
import {
  frontmatterPlugin,
  type FrontmatterPluginOptions
} from '@mdit-vue/plugin-frontmatter'

/**
 * 一个markdown-it插件，用于获取 markdown 标头:
 * 将所有标题信息提取到 markdown-itenv.headers中。
 */
import {
  headersPlugin,
  type HeadersPluginOptions
} from '@mdit-vue/plugin-headers'

/**
 * 一个markdown-it插件，帮助将 markdown 转换为Vue SFC:
 * 避免渲染<script>和<style>标记并将它们提取到 markdown-itenv.sfcBlocks中。
 * 支持提取自定义块。
 * 提供env.sfcBlocks.template方便。
 */
import { sfcPlugin, type SfcPluginOptions } from '@mdit-vue/plugin-sfc'

/**
 * 用于获取页面标题的markdown-it插件:
 * 将 title（第一个 level-1 标题的内容）提取到 markdown-itenv.title中。
 */
import { titlePlugin } from '@mdit-vue/plugin-title'

/**
 * 一个markdown-it插件，用于生成与Vue.js兼容的目录 (TOC):
 * 这个插件基本上是markdown-it-toc-done-right 的一个分支，具有以下增强功能：
 * 允许html_inline标题中的标签支持 vue 组件。
 * 支持containerTag、listTag和linkTag。
 * 仅允许在级别选项中使用数组。
 * 代码重构和优化。
 */
import { tocPlugin, type TocPluginOptions } from '@mdit-vue/plugin-toc'


// 一个用来提供代码块高亮和支持代码语言的库
import { IThemeRegistration } from 'shiki'


// plugins 下面的 vitepress 定制的 markdown-it 的 plugin
import { highlight } from './plugins/highlight'
import { slugify } from './plugins/slugify'
import { highlightLinePlugin } from './plugins/highlightLines'
import { lineNumberPlugin } from './plugins/lineNumbers'
import { containerPlugin } from './plugins/containers'
import { snippetPlugin } from './plugins/snippet'
import { preWrapperPlugin } from './plugins/preWrapper'
import { linkPlugin } from './plugins/link'
import { imagePlugin } from './plugins/image'
import { Header } from '../shared'

export type ThemeOptions =
  | IThemeRegistration
  | { light: IThemeRegistration; dark: IThemeRegistration }

// markdown 的配置一览：
// 对应官方文档：https://vitepress.vuejs.org/config/app-configs#markdown
export interface MarkdownOptions extends MarkdownIt.Options {
  lineNumbers?: boolean
  config?: (md: MarkdownIt) => void
  anchor?: anchorPlugin.AnchorOptions
  attrs?: {
    leftDelimiter?: string
    rightDelimiter?: string
    allowedAttributes?: string[]
    disable?: boolean
  }
  frontmatter?: FrontmatterPluginOptions
  headers?: HeadersPluginOptions
  sfc?: SfcPluginOptions
  theme?: ThemeOptions
  toc?: TocPluginOptions
  externalLinks?: Record<string, string>
}

export type MarkdownRenderer = MarkdownIt

export type { Header }

export const createMarkdownRenderer = async (
  srcDir: string,
  // config.js 中的 markdown 选项（就是 vitepress 中暴露出来给用户配置 markdown 的 config）
  options: MarkdownOptions = {},
  base = '/'
): Promise<MarkdownRenderer> => {
  const md = MarkdownIt({
    html: true,
    linkify: true,
    highlight: options.highlight || (await highlight(options.theme)),
    ...options
  }) as MarkdownRenderer

  // custom plugins
  // 对 markdown-it 添加的自定义扩展
  md.use(componentPlugin)
    .use(highlightLinePlugin)
    .use(preWrapperPlugin)
    .use(snippetPlugin, srcDir)
    .use(containerPlugin)
    .use(imagePlugin)
    .use(
      linkPlugin,
      {
        target: '_blank',
        rel: 'noreferrer',
        ...options.externalLinks
      },
      base
    )

  // 3rd party plugins
  if (!options.attrs?.disable) {
    md.use(attrsPlugin, options.attrs)
  }
  md.use(emojiPlugin)

  // mdit-vue plugins
  md.use(anchorPlugin, {
    slugify,
    permalink: anchorPlugin.permalink.ariaHidden({}),
    ...options.anchor
  } as anchorPlugin.AnchorOptions)
    .use(frontmatterPlugin, {
      ...options.frontmatter
    } as FrontmatterPluginOptions)
    .use(headersPlugin, {
      slugify,
      ...options.headers
    } as HeadersPluginOptions)
    .use(sfcPlugin, {
      ...options.sfc
    } as SfcPluginOptions)
    .use(titlePlugin)
    .use(tocPlugin, {
      slugify,
      ...options.toc
    } as TocPluginOptions)

  // apply user config
  if (options.config) {
    // 把 md 传进去,用于用户对 markdown 进行自定义扩展(看代码块中的最后一项 config: https://vitepress.vuejs.org/config/app-configs#markdown)
    options.config(md)
  }

  // 如果用户配置了 lineNumbers 属性(显示行号),那么就调用 lineNumberPlugin 插件
  if (options.lineNumbers) {
    md.use(lineNumberPlugin)
  }
  return md
}
