import {
  App,
  createApp as createClientApp,
  createSSRApp,
  defineComponent,
  h,
  onMounted,
  watch
} from 'vue'
import Theme from '@theme/index'
import { inBrowser, pathToFile } from './utils.js'
import { Router, RouterSymbol, createRouter } from './router.js'
import { siteDataRef, useData } from './data.js'
import { useUpdateHead } from './composables/head.js'
import { usePrefetch } from './composables/preFetch.js'
import { dataSymbol, initData } from './data.js'
import { Content } from './components/Content.js'
import { ClientOnly } from './components/ClientOnly.js'
import { useCopyCode } from './composables/copyCode.js'

// 自定义主题中的 NotFound 页面
const NotFound = Theme.NotFound || (() => '404 Not Found')

// 根组件,当创建实例的时候,这个组件就是创建出来的实例对应的组件
const VitePressApp = defineComponent({
  name: 'VitePressApp',
  setup() {
    const { site } = useData()

    // change the language on the HTML element based on the current lang
    // 监听语言变化，然后改变 html 中的对应语言
    onMounted(() => {
      watch(
        () => site.value.lang,
        (lang: string) => {
          document.documentElement.lang = lang
        },
        { immediate: true }
      )
    })

    if (import.meta.env.PROD) {
      // in prod mode, enable intersectionObserver based pre-fetch
      // 在生产环境下进行预解析(基于 intersectionObserver 进行预解析)
      usePrefetch()
    }

    // setup global copy code handler
    // 全局调用代码块复制的功能
    useCopyCode()

    // 然后执行用户自定义主题的 setup 函数
    if (Theme.setup) Theme.setup()

    // 最后把自定义主题渲染成 render 函数返回回去
    return () => h(Theme.Layout)
  }
})

export function createApp() {
  const router = newRouter()

  // 这个 app 就是 vue3 中 createApp 的实例（非ssr的情况），不过里面的对应组件是上面的 VitePressApp
  // 通过就可以得出一个结论: 自定义主题中 setup 函数执行时机要比 enhanceApp 函数执行时机要 早
  const app = newApp()

  // 全局传参
  app.provide(RouterSymbol, router)

  const data = initData(router.route)
  app.provide(dataSymbol, data)

  // provide this to avoid circular dependency in VPContent
  app.provide('NotFound', NotFound)

  // install global components
  app.component('Content', Content)
  app.component('ClientOnly', ClientOnly)

  // expose $frontmatter
  // 为 frontmatter 做一层代理
  Object.defineProperty(app.config.globalProperties, '$frontmatter', {
    get() {
      return data.frontmatter.value
    }
  })

  // 如果配置 enchanceApp 就调用
  if (Theme.enhanceApp) {
    // app is the Vue 3 app instance from `createApp()`.
    // router is VitePress custom router.
    // `siteData` is a `ref` of current site-level metadata.  ' siteData '是当前站点级元数据的' ref '。
    Theme.enhanceApp({
      app,
      router,
      siteData: siteDataRef
    })
  }

  // setup devtools in dev mode
  if (import.meta.env.DEV || __VUE_PROD_DEVTOOLS__) {
    import('./devtools.js').then(({ setupDevtools }) =>
      setupDevtools(app, router, data)
    )
  }

  return { app, router, data }
}

// 根据不同环境，选择不同的 vue 的入口函数
function newApp(): App {
  return import.meta.env.PROD
    ? createSSRApp(VitePressApp)
    // vue3 的 createApp 接收两个参数: function createApp(rootComponent, rootProps = null) {}
    // 第一参是根组件,第二参是根属性默认是空
    : createClientApp(VitePressApp)
}

function newRouter(): Router {
  let isInitialPageLoad = inBrowser
  let initialPath: string

  return createRouter((path) => {
    let pageFilePath = pathToFile(path)

    if (isInitialPageLoad) {
      initialPath = pageFilePath
    }

    // use lean build if this is the initial page load or navigating back
    // to the initial loaded path (the static vnodes already adopted the
    // static content on that load so no need to re-fetch the page)
    if (isInitialPageLoad || initialPath === pageFilePath) {
      pageFilePath = pageFilePath.replace(/\.js$/, '.lean.js')
    }

    if (inBrowser) {
      isInitialPageLoad = false
    }

    return import(/*@vite-ignore*/ pageFilePath)
  }, NotFound)
  // 这里 createRouter 的第二个参数就是路径匹配组件失败时用的，也就是路径匹配失败时用第二个参数作为路径的匹配结果一般都是 404
}

if (inBrowser) {
  const { app, router, data } = createApp()

  // wait until page component is fetched before mounting
  // 等待直到获取页面组件后再挂载
  router.go().then(() => {
    // dynamically update head tags
    // 动态更新 head 里面的内容然后再挂载
    useUpdateHead(router.route, data.site)
    app.mount('#app')
  })
}
