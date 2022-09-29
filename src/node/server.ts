import { setDefaultResultOrder } from 'node:dns'
import { createServer as createViteServer, ServerOptions } from 'vite'
import { resolveConfig } from './config'
import { createVitePressPlugin } from './plugin'

export async function createServer(
  // process.cwd() 方法返回的是 Node.js 进程的当前工作目录。
  root: string = process.cwd(),
  serverOptions: ServerOptions = {},
  recreateServer?: () => Promise<void>
) {
  const config = await resolveConfig(root)

  if (serverOptions.base) {
    config.site.base = serverOptions.base
    delete serverOptions.base
  }

  setDefaultResultOrder('verbatim')

  // 起的 vite 的服务
  return createViteServer({
    root: config.srcDir,
    base: config.site.base,
    // logLevel: 'warn',
    plugins: await createVitePressPlugin(config, false, {}, {}, recreateServer),
    server: serverOptions
  })
}
