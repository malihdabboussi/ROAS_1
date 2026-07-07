import { describe, expect, it, vi } from 'vitest'
import { ModalFileIoService } from './services/modal-file-io.service'

describe('ModalFileIoService listProjectDirectory', () => {
  it('rejects traversal paths before touching the sandbox', async () => {
    const service = new ModalFileIoService()
    const getSandbox = vi.fn()
    ;(service as never as { getSandbox: typeof getSandbox }).getSandbox = getSandbox

    await expect(service.listProjectDirectory('project-1', '../etc')).rejects.toThrow(
      /invalid directory path/i,
    )

    expect(getSandbox).not.toHaveBeenCalled()
  })

  it('normalizes safe subdirectories under /project', async () => {
    const service = new ModalFileIoService()
    const exec = vi.fn().mockResolvedValue({
      stdout: { readText: vi.fn().mockResolvedValue('components/\npage.tsx\nnode_modules/\n') },
    })
    const sandbox = { exec, detach: vi.fn() }
    ;(service as never as { getSandbox: unknown }).getSandbox = vi.fn().mockResolvedValue(sandbox)

    const result = await service.listProjectDirectory('project-1', '/src/')

    expect(exec).toHaveBeenCalledWith(['ls', '-1F', '/project/src'])
    expect(result).toEqual([
      { name: 'components', type: 'directory', path: 'src/components' },
      { name: 'page.tsx', type: 'file', path: 'src/page.tsx' },
    ])
    expect(sandbox.detach).toHaveBeenCalled()
  })
})
