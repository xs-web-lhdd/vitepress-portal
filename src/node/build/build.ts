// fs-extra是fs的一个扩展，提供了非常多的便利API，并且继承了fs所有方法和为fs方法添加了promise的支持。
import fs from 'fs-extra'
import path from 'path'
import ora from 'ora'
import { BuildOptions } from 'vite'
import { OutputChunk, OutputAsset } from 'rollup'
import { resolveConfig } from '../config'
import { renderPage } from './render'
import { bundle, okMark, failMark } from './bundle'
import { createRequire } from 'module'
// node 中核心模块 url
import { pathToFileURL } from 'url'

// 打包的入口文件:
export async function build(
  root?: string,
  buildOptions: BuildOptions & { base?: string; mpa?: string } = {}
) {
  const start = Date.now()

  // 定义环境为生成环境:
  process.env.NODE_ENV = 'production'
  const siteConfig = await resolveConfig(root, 'build', 'production')
  const unlinkVue = linkVue(siteConfig.root)

  // 设置命令行中的 base 
  if (buildOptions.base) {
    siteConfig.site.base = buildOptions.base
    delete buildOptions.base
  }

  // 多页面 mpa
  if (buildOptions.mpa) {
    siteConfig.mpa = true
    delete buildOptions.mpa
  }

  try {
    // 进行 bundle，内部调用 vite 的 build 进行打包
    const { clientResult, serverResult, pageToHashMap } = await bundle(
      siteConfig,
      buildOptions
    )

    const entryPath = path.join(siteConfig.tempDir, 'app.js')
    const { render } = await import(pathToFileURL(entryPath).toString())

    // node 中用于 人机交互
    const spinner = ora()
    spinner.start('rendering pages...')

    try {
      const appChunk =
        clientResult &&
        (clientResult.output.find(
          (chunk) =>
            chunk.type === 'chunk' &&
            chunk.isEntry &&
            chunk.facadeModuleId?.endsWith('.js')
        ) as OutputChunk)

      const cssChunk = (
        siteConfig.mpa ? serverResult : clientResult
      ).output.find(
        (chunk) => chunk.type === 'asset' && chunk.fileName.endsWith('.css')
      ) as OutputAsset

      // We embed the hash map string into each page directly so that it doesn't
      // alter the main chunk's hash on every build. It's also embedded as a
      // string and JSON.parsed from the client because it's faster than embedding
      // as JS object literal.
      const hashMapString = JSON.stringify(JSON.stringify(pageToHashMap))

      const pages = ['404.md', ...siteConfig.pages]

      for (const page of pages) {
        await renderPage(
          render,
          siteConfig,
          page,
          clientResult,
          appChunk,
          cssChunk,
          pageToHashMap,
          hashMapString
        )
      }
    } catch (e) {
      // 失败:
      spinner.stopAndPersist({
        symbol: failMark
      })
      throw e
    }
    // 成功:
    spinner.stopAndPersist({
      symbol: okMark
    })

    // emit page hash map for the case where a user session is open
    // when the site got redeployed (which invalidates current hash map)
    fs.writeJSONSync(
      path.join(siteConfig.outDir, 'hashmap.json'),
      pageToHashMap
    )
  } finally {
    // 打包完之后把 vue 删除
    unlinkVue()
    // 没有 debug 就把 根路径下/.vitepress/.temp 文件夹删除掉
    if (!process.env.DEBUG)
      // fs.rmSync 的教材: https://vimsky.com/examples/usage/node-js-fs-rmsync-method.html
      // fs.rmSync(path, options)方法用于在给定路径下同步删除文件。还可以通过配置options对象来递归使用它来删除目录。
      // force:它是一个布尔值。如果路径不存在，则将忽略异常。
      // recursive: 它是一个布尔值，它指定是否执行递归目录删除。在这种模式下，如果找不到指定的路径并且在失败时重试该操作，则不会报告错误。默认值为false。
      fs.rmSync(siteConfig.tempDir, { recursive: true, force: true })
    // siteConfig.tempDir 默认是 根路径下/.vitepress/.temp
  }

  // 调用用户配置的 buildEnd 钩子函数,  在 cli 推出之前,打包之后执行
  // 官网: https://vitepress.vuejs.org/config/app-configs#buildend
  await siteConfig.buildEnd?.(siteConfig)

  // 打包完成时给的提示,用了多长 s
  console.log(`build complete in ${((Date.now() - start) / 1000).toFixed(2)}s.`)
}

function linkVue(root: string) {
  const dest = path.resolve(root, 'node_modules/vue')
  // if user did not install vue by themselves, link VitePress' version
  // 如果用户没有自己安装vue，链接VitePress的版本
  if (!fs.existsSync(dest)) { // 同步检查 dest 目录是否存在
    // createRequire 教程：https://vimsky.com/examples/usage/nodejs-module-modulecreaterequirefilename-nj.html
    // 创建 require 对象，找到 vue 的路径
    const src = path.dirname(createRequire(import.meta.url).resolve('vue'))
    // 确保符号链接存在。如果目录结构不存在，则创建目录结构。
    fs.ensureSymlinkSync(src, dest, 'junction')
    // 返回一个删除 vuelink 的函数
    return () => {
      // 删除 dest 
      fs.unlinkSync(dest)
    }
  }
  return () => { }
}
