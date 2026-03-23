import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Badge } from './badge'

describe('Badge Component', () => {
  describe('Variants', () => {
    it('renders default variant correctly', () => {
      const { container } = render(<Badge>Default</Badge>)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('bg-primary')
      expect(badge.className).toContain('text-primary-foreground')
    })

    it('renders secondary variant correctly', () => {
      const { container } = render(<Badge variant="secondary">Secondary</Badge>)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('bg-secondary')
      expect(badge.className).toContain('text-secondary-foreground')
    })

    it('renders success variant correctly', () => {
      const { container } = render(<Badge variant="success">Success</Badge>)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('bg-success-bg')
      expect(badge.className).toContain('text-success')
      expect(badge.className).toContain('border-success')
    })

    it('renders warning variant correctly', () => {
      const { container } = render(<Badge variant="warning">Warning</Badge>)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('bg-warning-bg')
      expect(badge.className).toContain('text-warning')
      expect(badge.className).toContain('border-warning')
    })

    it('renders error variant correctly', () => {
      const { container } = render(<Badge variant="error">Error</Badge>)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('bg-error-bg')
      expect(badge.className).toContain('text-error')
      expect(badge.className).toContain('border-error')
    })

    it('renders outline variant correctly', () => {
      const { container } = render(<Badge variant="outline">Outline</Badge>)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('border-input')
      expect(badge.className).toContain('bg-background')
      expect(badge.className).toContain('text-foreground')
    })
  })

  describe('Sizes', () => {
    it('renders small size correctly', () => {
      const { container } = render(<Badge size="sm">Small</Badge>)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('px-2')
      expect(badge.className).toContain('py-0.5')
      expect(badge.className).toContain('text-xs')
    })

    it('renders default size correctly', () => {
      const { container } = render(<Badge>Default Size</Badge>)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('px-2.5')
      expect(badge.className).toContain('py-1')
      expect(badge.className).toContain('text-sm')
    })

    it('renders large size correctly', () => {
      const { container } = render(<Badge size="lg">Large</Badge>)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('px-3')
      expect(badge.className).toContain('py-1.5')
      expect(badge.className).toContain('text-base')
    })
  })

  describe('Design Token Usage', () => {
    it('uses semantic colors from design tokens', () => {
      const { container: successContainer } = render(<Badge variant="success">Success</Badge>)
      const { container: warningContainer } = render(<Badge variant="warning">Warning</Badge>)
      const { container: errorContainer } = render(<Badge variant="error">Error</Badge>)

      const successBadge = successContainer.firstChild as HTMLElement
      const warningBadge = warningContainer.firstChild as HTMLElement
      const errorBadge = errorContainer.firstChild as HTMLElement

      // Verify semantic color classes are used
      expect(successBadge.className).toContain('success')
      expect(warningBadge.className).toContain('warning')
      expect(errorBadge.className).toContain('error')
    })

    it('does not contain inline styles', () => {
      const variants = ['default', 'secondary', 'success', 'warning', 'error', 'outline'] as const
      
      variants.forEach(variant => {
        const { container } = render(<Badge variant={variant}>{variant}</Badge>)
        const badge = container.firstChild as HTMLElement
        expect(badge.getAttribute('style')).toBeNull()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper focus states', () => {
      const { container } = render(<Badge>Focus Test</Badge>)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('focus:outline-none')
      expect(badge.className).toContain('focus:ring-2')
      expect(badge.className).toContain('focus:ring-ring')
    })
  })

  describe('Combination of variants and sizes', () => {
    it('renders success badge with small size', () => {
      const { container } = render(<Badge variant="success" size="sm">Success Small</Badge>)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('bg-success-bg')
      expect(badge.className).toContain('text-xs')
    })

    it('renders warning badge with large size', () => {
      const { container } = render(<Badge variant="warning" size="lg">Warning Large</Badge>)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('bg-warning-bg')
      expect(badge.className).toContain('text-base')
    })
  })

  describe('Custom className', () => {
    it('merges custom className with variant classes', () => {
      const { container } = render(<Badge className="custom-class">Custom</Badge>)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('custom-class')
      expect(badge.className).toContain('bg-primary')
    })
  })
})
