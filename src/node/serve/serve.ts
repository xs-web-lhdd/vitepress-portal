import fs from 'fs'
import path from 'path'
// 主要使用 sirv 这个包，将 /public 变为静态资源目录的 servePublicMiddleware 中间件，可以通过 http://localhost:3000/public/xxx 获取 public 目录下的 xxx 文件
import sirv from 'sirv'
// 图片压缩的库
import compression from 'compression'
// 高性能的 express 的替代品：
// 官方链接：http://www.javascriptcn.com/post/polka
import polka from 'polka'
import { resolveConfig } from '../config'

function trimChar(str: string, char: string) {
  while (str.charAt(0) === char) {
    str = str.substring(1)
  }

  while (str.charAt(str.length - 1) === char) {
    str = str.substring(0, str.length - 1)
  }

  return str
}

export interface ServeOptions {
  base?: string
  root?: string
  port?: number
}

export async function serve(options: ServeOptions = {}) {
  const port = options.port !== undefined ? options.port : 4173
  const site = await resolveConfig(options.root, 'serve', 'production')
  const base = trimChar(options?.base ?? site?.site?.base ?? '', '/')

  const notAnAsset = (pathname: string) => !pathname.includes('/assets/')
  // 读取 404 页面
  const notFound = fs.readFileSync(path.resolve(site.outDir, './404.html'))
  const onNoMatch: polka.Options['onNoMatch'] = (req, res) => {
    res.statusCode = 404
    // 没找到返回 404 页面
    if (notAnAsset(req.path)) res.write(notFound.toString())
    res.end()
  }

  const compress = compression()
  // TODO: 猜测使用 sirv 对静态资源做缓存:
  const serve = sirv(site.outDir, {
    etag: true,
    maxAge: 31536000,
    immutable: true,
    setHeaders(res, pathname) {
      if (notAnAsset(pathname)) {
        // force server validation for non-asset files since they
        // are not fingerprinted
        res.setHeader('cache-control', 'no-cache')
      }
    }
  })

  // 用户配置了 base,就启动对应 base 路径下的服务
  if (base) {
    polka({ onNoMatch })
      .use(base, compress, serve)
      .listen(port, (err: any) => {
        if (err) throw err
        console.log(`Built site served at http://localhost:${port}/${base}/\n`)
      })
  } else {
    // 用户没有配置 base 就对应 跟路径地址
    polka({ onNoMatch })
      .use(compress, serve)
      .listen(port, (err: any) => {
        if (err) throw err
        console.log(`Built site served at http://localhost:${port}/\n`)
      })
  }
}
