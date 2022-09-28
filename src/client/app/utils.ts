import { siteDataRef } from './data.js'
import { inBrowser, EXTERNAL_URL_RE } from '../shared.js'

export { inBrowser }

/**
 * Join two paths by resolving the slash collision.
 */
export function joinPath(base: string, path: string): string {
  return `${base}${path}`.replace(/\/+/g, '/')
}

export function withBase(path: string) {
  return EXTERNAL_URL_RE.test(path)
    ? path
    : joinPath(siteDataRef.value.base, path)
}

/**
 * Converts a url path to the corresponding js chunk filename.
 * 将url路径转换为相应的js块文件名。
 */
export function pathToFile(path: string): string {
  let pagePath = path.replace(/\.html$/, '')
  pagePath = decodeURIComponent(pagePath)
  // 如果路径是以 / 为结尾，那么自动去找对应的 index
  if (pagePath.endsWith('/')) {
    pagePath += 'index'
  }

  if (import.meta.env.DEV) {
    // always force re-fetch content in dev
    pagePath += `.md?t=${Date.now()}`
  } else {
    // in production, each .md file is built into a .md.js file following
    // the path conversion scheme.
    // /foo/bar.html -> ./foo_bar.md

    // 在生产环境下中，每个.md文件按照路径转换方案被构建到.md.js文件中。
    if (inBrowser) {
      const base = import.meta.env.BASE_URL
      pagePath =
        (pagePath.slice(base.length).replace(/\//g, '_') || 'index') + '.md'
      // client production build needs to account for page hash, which is
      // injected directly in the page's html

      // 客户端产品构建需要考虑页面哈希，它直接注入到页面的HTML中
      const pageHash = __VP_HASH_MAP__[pagePath.toLowerCase()]
      // 打包后的文件在 assets 下面,格式就是这种 ${pagePath}.${pageHash}.js 格式
      pagePath = `${base}assets/${pagePath}.${pageHash}.js`
    } else {
      // ssr build uses much simpler name mapping
      pagePath = `./${pagePath.slice(1).replace(/\//g, '_')}.md.js`
    }
  }

  return pagePath
}
