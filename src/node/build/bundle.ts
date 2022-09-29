import ora from 'ora'
import path from 'path'
import fs from 'fs-extra'
// 用 vite 的 build 进行打包
import { build, BuildOptions, UserConfig as ViteUserConfig } from 'vite'
import { RollupOutput } from 'rollup'
import { slash } from '../utils/slash'
import { SiteConfig } from '../config'
import { APP_PATH } from '../alias'
import { createVitePressPlugin } from '../plugin'
import { buildMPAClient } from './buildMPAClient'

export const okMark = '\x1b[32m✓\x1b[0m'
export const failMark = '\x1b[31m✖\x1b[0m'

// bundles the VitePress app for both client AND server.
export async function bundle(
  config: SiteConfig,
  options: BuildOptions
): Promise<{
  clientResult: RollupOutput
  serverResult: RollupOutput
  pageToHashMap: Record<string, string>
}> {
  const pageToHashMap = Object.create(null)
  const clientJSMap = Object.create(null)

  // define custom rollup input
  // this is a multi-entry build - every page is considered an entry chunk
  // the loading is done via filename conversion rules so that the
  // metadata doesn't need to be included in the main chunk.
  // 这是一个多条目构建—每个页面都被认为是一个条目块，加载是通过文件名转换规则完成的，因此 meta 数据不需要包含在主块中。
  const input: Record<string, string> = {}
  config.pages.forEach((file) => {
    // page filename conversion
    // foo/bar.md -> foo_bar.md
    // 页面文件名转换,将 foo/bar.md 转换为 foo_bar.md
    input[slash(file).replace(/\//g, '_')] = path.resolve(config.srcDir, file)
  })

  // resolve options to pass to vite
  // 解析传递给vite的选项
  const { rollupOptions } = options

  const resolveViteConfig = async (ssr: boolean): Promise<ViteUserConfig> => ({
    root: config.srcDir,
    base: config.site.base,
    logLevel: 'warn',
    plugins: await createVitePressPlugin(
      config,
      ssr,
      pageToHashMap,
      clientJSMap
    ),
    ssr: {
      noExternal: ['vitepress', '@docsearch/css']
    },
    build: {
      ...options,
      emptyOutDir: true,
      ssr,
      outDir: ssr ? config.tempDir : config.outDir,
      cssCodeSplit: false,
      rollupOptions: {
        ...rollupOptions,
        input: {
          ...input,
          // use different entry based on ssr or not
          app: path.resolve(APP_PATH, ssr ? 'ssr.js' : 'index.js')
        },
        // important so that each page chunk and the index export things for each
        // other
        preserveEntrySignatures: 'allow-extension',
        output: {
          ...rollupOptions?.output,
          ...(ssr
            ? {
              entryFileNames: `[name].js`,
              chunkFileNames: `[name].[hash].js`
            }
            : {
              chunkFileNames(chunk) {
                // avoid ads chunk being intercepted by adblock
                return /(?:Carbon|BuySell)Ads/.test(chunk.name)
                  ? `assets/chunks/ui-custom.[hash].js`
                  : `assets/chunks/[name].[hash].js`
              },
              manualChunks(id, ctx) {
                // move known framework code into a stable chunk so that
                // custom theme changes do not invalidate hash for all pages
                if (id.includes('plugin-vue:export-helper')) {
                  return 'framework'
                }
                if (
                  isEagerChunk(id, ctx) &&
                  (/@vue\/(runtime|shared|reactivity)/.test(id) ||
                    /vitepress\/dist\/client/.test(id))
                ) {
                  return 'framework'
                }
              }
            })
        }
      },
      // minify with esbuild in MPA mode (for CSS)
      minify: ssr ? (config.mpa ? 'esbuild' : false) : !process.env.DEBUG
    }
  })

  let clientResult: RollupOutput
  let serverResult: RollupOutput

  // 开始打包:
  const spinner = ora()
  spinner.start('building client + server bundles...')
  try {
    ;[clientResult, serverResult] = await (Promise.all([
      config.mpa ? null : build(await resolveViteConfig(false)),
      build(await resolveViteConfig(true))
    ]) as Promise<[RollupOutput, RollupOutput]>)
  } catch (e) {
    spinner.stopAndPersist({
      symbol: failMark
    })
    throw e
  }
  // 成功打包
  spinner.stopAndPersist({
    symbol: okMark
  })

  if (config.mpa) {
    // in MPA mode, we need to copy over the non-js asset files from the
    // server build since there is no client-side build.
    for (const chunk of serverResult.output) {
      if (!chunk.fileName.endsWith('.js')) {
        const tempPath = path.resolve(config.tempDir, chunk.fileName)
        const outPath = path.resolve(config.outDir, chunk.fileName)
        await fs.copy(tempPath, outPath)
      }
    }
    // also copy over public dir
    const publicDir = path.resolve(config.srcDir, 'public')
    if (fs.existsSync(publicDir)) {
      await fs.copy(publicDir, config.outDir)
    }
    // build <script client> bundle
    if (Object.keys(clientJSMap).length) {
      clientResult = await buildMPAClient(clientJSMap, config)
    }
  }

  return { clientResult, serverResult, pageToHashMap }
}

const cache = new Map<string, boolean>()

/**
 * Check if a module is statically imported by at least one entry.
 */
function isEagerChunk(id: string, { getModuleInfo }: any) {
  if (
    id.includes('node_modules') &&
    !/\.css($|\\?)/.test(id) &&
    staticImportedByEntry(id, getModuleInfo, cache)
  ) {
    return 'vendor'
  }
}

function staticImportedByEntry(
  id: string,
  getModuleInfo: any,
  cache: Map<string, boolean>,
  importStack: string[] = []
): boolean {
  if (cache.has(id)) {
    return !!cache.get(id)
  }
  if (importStack.includes(id)) {
    // circular deps!
    cache.set(id, false)
    return false
  }
  const mod = getModuleInfo(id)
  if (!mod) {
    cache.set(id, false)
    return false
  }

  if (mod.isEntry) {
    cache.set(id, true)
    return true
  }
  const someImporterIs = mod.importers.some((importer: string) =>
    staticImportedByEntry(
      importer,
      getModuleInfo,
      cache,
      importStack.concat(id)
    )
  )
  cache.set(id, someImporterIs)
  return someImporterIs
}
