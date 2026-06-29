import { describe, it, expect } from 'vitest'
import { resolveAsset } from './assets'

// BASE_URL is "/" under test, so VITE_IMAGES_BASE defaults to "/recipe-images/".
describe('resolveAsset', () => {
  it('passes absolute http(s) URLs through unchanged', () => {
    expect(resolveAsset('https://cdn.example/x.jpg')).toBe('https://cdn.example/x.jpg')
    expect(resolveAsset('http://cdn.example/x.jpg')).toBe('http://cdn.example/x.jpg')
  })

  it('passes data: and blob: URLs through unchanged', () => {
    expect(resolveAsset('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA')
    expect(resolveAsset('blob:abc-123')).toBe('blob:abc-123')
  })

  it('maps a bare filename (imported recipe image) to the private-images route', () => {
    expect(resolveAsset('10-min-asian-beef.jpg')).toBe('/recipe-images/10-min-asian-beef.jpg')
  })

  it('resolves a committed asset path against the base path', () => {
    expect(resolveAsset('demo/images/sunset-tomato-orzo.svg')).toBe(
      '/demo/images/sunset-tomato-orzo.svg',
    )
  })

  it('tolerates a leading slash on an asset path', () => {
    expect(resolveAsset('/demo/images/x.svg')).toBe('/demo/images/x.svg')
  })
})
