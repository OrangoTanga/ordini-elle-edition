export {}

interface IpcRenderer {
  invoke: (channel: string, ...args: any[]) => Promise<any>
  on: (channel: string, callback: (...args: any[]) => void) => void
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    electron?: {
      ipcRenderer: IpcRenderer
      getAppVersion: () => Promise<string>
      downloadAndInstallUpdate: (url: string) => Promise<{ ok: boolean; error?: string }>
    }
  }
}
