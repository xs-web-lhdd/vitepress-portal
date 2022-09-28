import { watchEffect, Ref } from 'vue'
import { HeadConfig, SiteData, createTitle, mergeHead } from '../../shared.js'
import { Route } from '../router.js'

export function useUpdateHead(route: Route, siteDataByRouteRef: Ref<SiteData>) {
  let managedHeadTags: HTMLElement[] = []
  let isFirstUpdate = true

  const updateHeadTags = (newTags: HeadConfig[]) => {
    if (import.meta.env.PROD && isFirstUpdate) {
      // in production, the initial meta tags are already pre-rendered so we
      // skip the first update.

      // 在生产中，初始 meta 标记已经 pre-rendered，因此我们跳过第一次更新。
      isFirstUpdate = false
      return
    }

    managedHeadTags.forEach((el) => document.head.removeChild(el))
    managedHeadTags = []
    // 本函数的核心代码，先将之前的 head 内的标签全部删除，然后再将新标签全部插入，然后记录新标签（managedHeadTags.push(el)），进行方便进行下一次的更新
    newTags.forEach((headConfig) => {
      const el = createHeadElement(headConfig)
      document.head.appendChild(el)
      // 记录新标签吗，方便进行下一次的更新
      managedHeadTags.push(el)
    })
  }

  watchEffect(() => {
    const pageData = route.data
    const siteData = siteDataByRouteRef.value
    const pageDescription = pageData && pageData.description
    const frontmatterHead = (pageData && pageData.frontmatter.head) || []

    // update title and description
    // 对 title 进行更新
    document.title = createTitle(siteData, pageData)

    // 对 meta 进行更新，这里对 meta 标签已经做过处理了，所以后续 updateHeadTags 就不需要做处理了
    document
      .querySelector(`meta[name=description]`)!
      .setAttribute('content', pageDescription || siteData.description)

    updateHeadTags(
      mergeHead(siteData.head, filterOutHeadDescription(frontmatterHead))
    )
  })
}

// 创建元素并设置属性和内容
function createHeadElement([tag, attrs, innerHTML]: HeadConfig) {
  const el = document.createElement(tag)
  for (const key in attrs) {
    el.setAttribute(key, attrs[key])
  }
  if (innerHTML) {
    el.innerHTML = innerHTML
  }
  return el
}

// 判断是不是 meta 标签并设置的 description 属性
function isMetaDescription(headConfig: HeadConfig) {
  return (
    headConfig[0] === 'meta' &&
    headConfig[1] &&
    headConfig[1].name === 'description'
  )
}

// 过滤出 head 标签中不是 mtea 的标签
function filterOutHeadDescription(head: HeadConfig[]) {
  return head.filter((h) => !isMetaDescription(h))
}
