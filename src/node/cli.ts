/**
 * 这个文件猜测时用来管理 cli 输入的
 */


import c from 'picocolors'
// 解析参数选项
// 这个模块是 optimist 参数解析器的核心，没有任何花哨的装饰。
import minimist from 'minimist'
import { createServer, build, serve } from '.'
import { version } from '../../package.json'

const argv: any = minimist(process.argv.slice(2))

console.log(c.cyan(`vitepress v${version}`))

const command = argv._[0]
const root = argv._[command ? 1 : 0]
if (root) {
  argv.root = root
}

// npm run dev 时执行的程序
if (!command || command === 'dev') {
  // 这个函数来自于 ./server.ts
  const createDevServer = async () => {
    const server = await createServer(root, argv, async () => {
      await server.close()
      await createDevServer()
    })
    await server.listen()
    console.log()
    server.printUrls()
  }
  // 启动出错就报错,并且退出
  createDevServer().catch((err) => {
    console.error(c.red(`failed to start server. error:\n`), err)
    process.exit(1) // 退出程序
  })
} else if (command === 'build') {
  build(root, argv).catch((err) => {
    console.error(c.red(`build error:\n`), err)
    process.exit(1)
  })
} else if (command === 'serve') {
  // 来自于 ./serve/serve.ts
  serve(argv).catch((err) => {
    console.error(c.red(`failed to start server. error:\n`), err)
    process.exit(1)
  })
} else {
  // 不认识的命令:
  console.log(c.red(`unknown command "${command}".`))
  process.exit(1)
}
