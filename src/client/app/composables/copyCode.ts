import { inBrowser } from '../utils.js'

export function useCopyCode() {
  if (inBrowser) {
    window.addEventListener('click', (e) => {
      const el = e.target as HTMLElement
      // 如果点击的按钮是语言块中的 copy 按钮
      if (el.matches('div[class*="language-"] > button.copy')) {
        // 拿到父元素
        const parent = el.parentElement
        // 拿到下一个兄弟元素的下一个兄弟元素
        const sibling = el.nextElementSibling
          ?.nextElementSibling as HTMLPreElement | null
        if (!parent || !sibling) {
          return
        }

        // 判断是不是 shell 脚本
        const isShell = /language-(shellscript|shell|bash|sh|zsh)/.test(
          parent.classList.toString()
        )

        // 这个 text 就是语言块中的内容
        let { innerText: text = '' } = sibling

        if (isShell) {
          text = text.replace(/^ *(\$|>) /gm, '')
        }

        copyToClipboard(text).then(() => {
          // 拷贝完之后改变 copy 的图标
          el.classList.add('copied')
          // 两秒后恢复之前的 copy 图标
          setTimeout(() => {
            el.classList.remove('copied')
            el.blur()
          }, 2000)
        })
      }
    })
  }
}

async function copyToClipboard(text: string) {
  try {
    // 把 text 复制到粘贴板上
    return navigator.clipboard.writeText(text)
  } catch {
    // 如果不兼容 navigator.clipboard 采用下面的方式进行复制

    const element = document.createElement('textarea')
    // 拿到之前焦点的元素: document.activeElement 是用来获取当前页面的焦点元素
    const previouslyFocusedElement = document.activeElement

    element.value = text

    // Prevent keyboard from showing on mobile
    // 防止键盘显示在手机上 ( 表单设置 readonly 属性后就不能对表单进行编辑,自然就不会有键盘出现)
    element.setAttribute('readonly', '')

    element.style.contain = 'strict'
    element.style.position = 'absolute'
    element.style.left = '-9999px'
    // 防止iOS上的缩放
    element.style.fontSize = '12pt' // Prevent zooming on iOS

    // 返回一个 Selection 对象，表示用户选择的文本范围或光标的当前位置。
    const selection = document.getSelection()
    const originalRange = selection
      ? selection.rangeCount > 0 && selection.getRangeAt(0)
      : null

    document.body.appendChild(element)
    // 选中这个 textarea 也就是相当于获取焦点
    element.select()

    // Explicit selection workaround for iOS
    // iOS的显式选择方法
    // 用来确定复制内容的开始位置和结束位置
    element.selectionStart = 0
    element.selectionEnd = text.length

    // 该方法允许运行命令来操纵可编辑内容区域的元素。 这里是执行 copy 命令
    document.execCommand('copy')
    document.body.removeChild(element)

    if (originalRange) {
      // 当选择是错误的时候，originalRange不可能是真的
      selection!.removeAllRanges() // originalRange can't be truthy when selection is falsy
      selection!.addRange(originalRange)
    }

    // Get the focus back on the previously focused element, if any
    // 让焦点回到之前聚焦的元素上(如果有的话)
    if (previouslyFocusedElement) {
      ; (previouslyFocusedElement as HTMLElement).focus()
    }
  }
}
