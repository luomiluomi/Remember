type ExportBridge = { begin(id: string): boolean; append(data: string): boolean; save(name: string): void; cancel(): void }
export async function saveArchive(name: string, blob: Blob): Promise<'saved' | 'cancel' | 'download'> {
  const native = (window as unknown as { MemoryExport?: ExportBridge }).MemoryExport
  if (!native) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60000)
    return 'download'
  }
  const id = crypto.randomUUID()
  if (!native.begin(id)) { throw new Error('已有导出任务正在保存，请稍候') }
  try {
    for (let offset = 0; offset < blob.size; offset += 192 * 1024) {
      const bytes = new Uint8Array(await blob.slice(offset, offset + 192 * 1024).arrayBuffer())
      let binary = ''
      for (const byte of bytes) { binary += String.fromCharCode(byte) }
      if (!native.append(btoa(binary))) { throw new Error('准备导出文件失败，请检查可用空间') }
    }
  } catch (error) { native.cancel(); throw error }
  return new Promise((resolve, reject) => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; status: string; message: string }>).detail
      if (detail.id !== id) { return }
      window.removeEventListener('memory-export-result', listener)
      if (detail.status === 'error') { reject(new Error(detail.message)) }
      else { resolve(detail.status === 'saved' ? 'saved' : 'cancel') }
    }
    window.addEventListener('memory-export-result', listener)
    native.save(name)
  })
}
