import { InjectionKey, Ref, shallowRef, readonly, computed, inject } from 'vue'
import { Route } from './router.js'
import siteData from '@siteData'
import {
  PageData,
  SiteData,
  resolveSiteDataByRoute,
  createTitle
} from '../shared.js'
import { withBase } from './utils.js'

export const dataSymbol: InjectionKey<VitePressData> = Symbol()

export interface VitePressData<T = any> {
  site: Ref<SiteData<T>>
  page: Ref<PageData>
  theme: Ref<T>
  frontmatter: Ref<PageData['frontmatter']>
  title: Ref<string>
  description: Ref<string>
  lang: Ref<string>
  localePath: Ref<string>
}

// site data is a singleton
// 站点数据是单例的
export const siteDataRef: Ref<SiteData> = shallowRef(
  (import.meta.env.PROD ? siteData : readonly(siteData)) as SiteData
)

// hmr
if (import.meta.hot) {
  // 给 config.js 做热更新
  import.meta.hot.accept('/@siteData', (m) => {
    if (m) {
      // 将站点的数据（响应式的被ref包过一层）更新为 config.js 热更新后的值
      siteDataRef.value = m.default
    }
  })
}

// per-app data
export function initData(route: Route): VitePressData {
  const site = computed(() =>
    // 这将通过路由将 locales 设置数据合并到主数据
    resolveSiteDataByRoute(siteDataRef.value, route.path)
  )

  return {
    site,
    theme: computed(() => site.value.themeConfig),
    page: computed(() => route.data),
    frontmatter: computed(() => route.data.frontmatter),
    lang: computed(() => site.value.lang),
    localePath: computed(() => {
      const { langs, lang } = site.value
      /**TODO:
       * 这里做的目的应该是为了方便匹配 locales 中的配置用的，返回的是 locals 中对应的 路径，举例：locales就是 langs
       * 下面这个是在 config.ts 中配置的
       *   locales: {
          '/': {
            lang: 'zh',
            title: 'openEuler',
            description:
              'openEuler 是一个开源、免费的 Linux 发行版平台，将通过开放的社区形式与全球的开发者共同构建一个开放、多元和架构包容的软件生态体系。同时，openEuler 也是一个创新的平台，鼓励任何人在该平台上提出新想法、开拓新思路、实践新方案。',
          },
          '/zh/': {
            lang: 'zh',
            title: 'openEuler',
            description:
              'openEuler 是一个开源、免费的 Linux 发行版平台，将通过开放的社区形式与全球的开发者共同构建一个开放、多元和架构包容的软件生态体系。同时，openEuler 也是一个创新的平台，鼓励任何人在该平台上提出新想法、开拓新思路、实践新方案。',
          },
          '/en/': {
            lang: 'en',
            title: 'openEuler',
            description:
              'openEuler is an open source, free Linux distribution platform. The platform provides an open community for global developers to build an open, diversified, and architecture-inclusive software ecosystem. openEuler is also an innovative platform that encourages everyone to propose new ideas, explore new approaches, and practice new solutions.',
          },
          '/ru/': {
            lang: 'ru',
            title: 'openEuler',
            description:
              'openEuler is an open source, free Linux distribution platform. The platform provides an open community for global developers to build an open, diversified, and architecture-inclusive software ecosystem. openEuler is also an innovative platform that encourages everyone to propose new ideas, explore new approaches, and practice new solutions.',
          },
        },
       */
      const path = Object.keys(langs).find(
        (langPath) => langs[langPath].lang === lang
      )
      return withBase(path || '/')
    }),
    title: computed(() => {
      return createTitle(site.value, route.data)
    }),
    description: computed(() => {
      return route.data.description || site.value.description
    })
  }
}

export function useData<T = any>(): VitePressData<T> {
  const data = inject(dataSymbol)
  if (!data) {
    throw new Error('vitepress data not properly injected in app')
  }
  return data
}
