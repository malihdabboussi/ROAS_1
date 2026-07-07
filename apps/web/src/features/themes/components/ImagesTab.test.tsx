import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { backendPost } from '@/lib/api/backend-client'
import type { BrandValues, BrandVoice, ThemeImageEntry } from '../types'
import { ImagesTab } from './ImagesTab'

vi.mock('@/lib/api/backend-client', () => ({
  backendPost: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

const backendPostMock = vi.mocked(backendPost)

const BRAND_VOICE: BrandVoice = {
  tone: 'calm',
  style: 'editorial',
  personality: 'precise',
}

const BRAND_VALUES: BrandValues = {
  primary: 'clarity',
  secondary: ['trust'],
  tagline: 'Ship the signal',
}

const HEADSHOTS: ThemeImageEntry[] = [
  {
    asset_id: 'headshot-1',
    url: '/headshot-1.png',
    name: 'Founder front',
    description: 'Front-facing studio lighting',
  },
]

const PRODUCTS: ThemeImageEntry[] = [
  {
    asset_id: 'product-1',
    url: '/product-1.png',
    name: 'Platform screenshot',
    description: 'Dashboard overview',
  },
]

function renderImagesTab(overrides: Partial<React.ComponentProps<typeof ImagesTab>> = {}) {
  const props: React.ComponentProps<typeof ImagesTab> = {
    imageStylePrompt: 'warm editorial lighting',
    onChangeImageStylePrompt: vi.fn(),
    brandVoice: BRAND_VOICE,
    brandValues: BRAND_VALUES,
    headshotImages: HEADSHOTS,
    onUploadHeadshot: vi.fn().mockResolvedValue(undefined),
    onRemoveHeadshot: vi.fn(),
    onUpdateHeadshot: vi.fn(),
    productImages: PRODUCTS,
    onUploadProductImage: vi.fn().mockResolvedValue(undefined),
    onRemoveProductImage: vi.fn(),
    onUpdateProductImage: vi.fn(),
    ...overrides,
  }

  return {
    ...render(<ImagesTab {...props} />),
    props,
  }
}

describe('ImagesTab', () => {
  beforeEach(() => {
    backendPostMock.mockReset()
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:theme-image-preview'),
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders image sections and forwards existing image edits', () => {
    const { props, container } = renderImagesTab()

    expect(screen.getByText('Your Headshots')).toBeInTheDocument()
    expect(screen.getByText('Product & Brand Images')).toBeInTheDocument()
    expect(screen.getByText('Image Style')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Founder front')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Platform screenshot')).toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue('Founder front'), {
      target: { value: 'Founder profile' },
    })
    expect(props.onUpdateHeadshot).toHaveBeenCalledWith(0, { name: 'Founder profile' })

    const removeButtons = container.querySelectorAll('.btn-icon-glass-destructive')
    fireEvent.click(removeButtons[0]!)
    expect(props.onRemoveHeadshot).toHaveBeenCalledWith(0)
  })

  it('collects pending upload metadata before calling the upload callback', async () => {
    const { props, container } = renderImagesTab({ headshotImages: [] })
    const file = new File(['image-bytes'], 'founder-photo.png', { type: 'image/png' })
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [file] } })

    expect(screen.getByDisplayValue('founder-photo')).toBeInTheDocument()
    fireEvent.change(screen.getByDisplayValue('founder-photo'), {
      target: { value: 'Founder profile' },
    })
    fireEvent.change(screen.getByPlaceholderText(/Short description/i), {
      target: { value: 'Front-facing studio shot' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Upload' }))

    await waitFor(() => {
      expect(props.onUploadHeadshot).toHaveBeenCalledWith(
        file,
        'Founder profile',
        'Front-facing studio shot',
      )
    })
    expect(screen.queryByDisplayValue('Founder profile')).not.toBeInTheDocument()
  })

  it('generates style keywords from brand identity and reports prompt changes', async () => {
    backendPostMock.mockResolvedValue({ imageStylePrompt: 'soft light, warm glass, editorial' })
    const onChangeImageStylePrompt = vi.fn()

    renderImagesTab({
      imageStylePrompt: null,
      onChangeImageStylePrompt,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Generate' }))

    await waitFor(() => {
      expect(backendPostMock).toHaveBeenCalledWith('/themes/generate-image-style', {
        brandVoice: BRAND_VOICE,
        brandValues: BRAND_VALUES,
      })
    })
    expect(onChangeImageStylePrompt).toHaveBeenCalledWith('soft light, warm glass, editorial')

    fireEvent.change(screen.getByPlaceholderText(/minimalist, professional photography/i), {
      target: { value: 'cinematic shadows' },
    })
    expect(onChangeImageStylePrompt).toHaveBeenCalledWith('cinematic shadows')
  })

  it('disables generation without brand identity and settles after rerender', async () => {
    let commits = 0

    const { rerender } = render(
      <Profiler id="images-tab" onRender={() => (commits += 1)}>
        <ImagesTab
          imageStylePrompt={null}
          onChangeImageStylePrompt={vi.fn()}
          brandVoice={null}
          brandValues={null}
        />
      </Profiler>,
    )

    expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled()
    expect(screen.getByText(/Fill in your Brand Identity tab first/i)).toBeInTheDocument()

    rerender(
      <Profiler id="images-tab" onRender={() => (commits += 1)}>
        <ImagesTab
          imageStylePrompt="cinematic"
          onChangeImageStylePrompt={vi.fn()}
          brandVoice={BRAND_VOICE}
          brandValues={BRAND_VALUES}
          headshotImages={HEADSHOTS}
        />
      </Profiler>,
    )

    await waitFor(() => expect(commits).toBeLessThan(8))
  })
})
