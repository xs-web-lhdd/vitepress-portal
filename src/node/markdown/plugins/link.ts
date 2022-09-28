/**
 * 这个 pulgin 主要做两件事：
 *  1、为外部链接添加 target="_blank"
 *  2、为内部链接的末尾添加 .html，因为 md 会转换为 html
 */

// markdown-it plugin for:
// 1. adding target="_blank" to external links
// 2. normalize internal links to end with `.html`

import MarkdownIt from 'markdown-it'
import type { MarkdownEnv } from '../env'
import { URL } from 'url'
import { EXTERNAL_URL_RE } from '../../shared'

const indexRE = /(^|.*\/)index.md(#?.*)$/i

export const linkPlugin = (
  md: MarkdownIt,
  externalAttrs: Record<string, string>,
  base: string
) => {
  md.renderer.rules.link_open = (
    tokens,
    idx,
    options,
    env: MarkdownEnv,
    self
  ) => {
    const token = tokens[idx]
    const hrefIndex = token.attrIndex('href')
    if (hrefIndex >= 0) {
      const hrefAttr = token.attrs![hrefIndex]
      const url = hrefAttr[1]
      const isExternal = EXTERNAL_URL_RE.test(url)
      // 判断是不是外部链接：
      if (isExternal) {
        Object.entries(externalAttrs).forEach(([key, val]) => {
          token.attrSet(key, val)
        })
        // catch localhost links as dead link
        if (url.replace(EXTERNAL_URL_RE, '').startsWith('//localhost:')) {
          pushLink(url, env)
        }
      } else if (
        // internal anchor links 内部锚点链接
        !url.startsWith('#') &&
        // mail links 邮件链接
        !url.startsWith('mailto:') &&
        // links to files (other than html/md) 文件链接
        !/\.(?!html|md)\w+($|\?)/i.test(url)
      ) {
        normalizeHref(hrefAttr, env)
      }

      // encode vite-specific replace strings in case they appear in URLs
      // this also excludes them from build-time replacements (which injects
      // <wbr/> and will break URLs)
      hrefAttr[1] = hrefAttr[1]
        .replace(/\bimport\.meta/g, 'import%2Emeta')
        .replace(/\bprocess\.env/g, 'process%2Eenv')
    }
    return self.renderToken(tokens, idx, options)
  }

  function normalizeHref(hrefAttr: [string, string], env: MarkdownEnv) {
    let url = hrefAttr[1]

    const indexMatch = url.match(indexRE)
    if (indexMatch) {
      const [, path, hash] = indexMatch
      url = path + hash
    } else {
      let cleanUrl = url.replace(/[?#].*$/, '')
      // transform foo.md -> foo[.html]
      if (cleanUrl.endsWith('.md')) {
        cleanUrl = cleanUrl.replace(
          /\.md$/,
          env.cleanUrls === 'disabled' ? '.html' : ''
        )
      }
      // transform ./foo -> ./foo[.html]
      if (
        env.cleanUrls === 'disabled' &&
        !cleanUrl.endsWith('.html') &&
        !cleanUrl.endsWith('/')
      ) {
        cleanUrl += '.html'
      }
      const parsed = new URL(url, 'http://a.com')
      url = cleanUrl + parsed.search + parsed.hash
    }

    // ensure leading . for relative paths
    if (!url.startsWith('/') && !/^\.\//.test(url)) {
      url = './' + url
    }

    // export it for existence check
    pushLink(url.replace(/\.html$/, ''), env)

    // append base to internal (non-relative) urls
    if (url.startsWith('/')) {
      url = `${base}${url}`.replace(/\/+/g, '/')
    }

    // markdown-it encodes the uri
    hrefAttr[1] = decodeURI(url)
  }

  function pushLink(link: string, env: MarkdownEnv) {
    const links = env.links || (env.links = [])
    links.push(link)
  }
}
