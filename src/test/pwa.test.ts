import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('PWA Requirements', () => {
  it('should have a manifest configuration in vite.config.ts', async () => {
    const configPath = path.resolve(process.cwd(), 'vite.config.ts')
    const configContent = fs.readFileSync(configPath, 'utf-8')
    
    expect(configContent).toContain('VitePWA')
    expect(configContent).toContain('manifest:')
    expect(configContent).toContain('name:')
    expect(configContent).toContain('short_name:')
    expect(configContent).toContain('icons:')
    expect(configContent).toContain('start_url:')
    expect(configContent).toContain("display: 'standalone'")
  })

  it('should have a service worker source file', () => {
    const swPath = path.resolve(process.cwd(), 'src/sw.ts')
    expect(fs.existsSync(swPath)).toBe(true)
    
    const swContent = fs.readFileSync(swPath, 'utf-8')
    // Using regex to be more flexible with formatting
    expect(swContent).toMatch(/self\.addEventListener\(['"]fetch['"]/)
    expect(swContent).toMatch(/self\.addEventListener\(['"]install['"]/)
  })

  it('should have required icons in public folder', () => {
    const icon192 = path.resolve(process.cwd(), 'public/pwa-192.png')
    const icon512 = path.resolve(process.cwd(), 'public/pwa-512.png')
    
    expect(fs.existsSync(icon192)).toBe(true)
    expect(fs.existsSync(icon512)).toBe(true)
  })

  it('should have absolute paths for icons in index.html for reliable resolution', () => {
    const indexPath = path.resolve(process.cwd(), 'index.html')
    const indexContent = fs.readFileSync(indexPath, 'utf-8')
    
    expect(indexContent).toContain('href="/routine2/pwa-192.png"')
    expect(indexContent).toContain('href="/routine2/favicon.svg"')
  })

  it('should have the correct base and scope in vite.config.ts', () => {
    const configPath = path.resolve(process.cwd(), 'vite.config.ts')
    const configContent = fs.readFileSync(configPath, 'utf-8')
    
    expect(configContent).toContain("base: '/routine2/'")
    expect(configContent).toContain("scope: '/routine2/'")
    expect(configContent).toContain("start_url: '/routine2/'")
  })
})
