import { defineComponent, h } from 'vue'
import { useRoute } from '../router.js'

export const Content = defineComponent({
  name: 'VitePressContent',
  setup() {
    const route = useRoute()
    return () =>
      h('div', { style: { position: 'relative' } }, [
        // 有组件就渲染出来,路由表中对应路径和组件
        route.component ? h(route.component) : null
      ])
  }
})
