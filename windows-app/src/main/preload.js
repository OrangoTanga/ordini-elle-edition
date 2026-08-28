const { contextBridge, ipcRenderer, shell } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    on: (channel, callback) => {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    },
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  },
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  downloadAndInstallUpdate: (url) => ipcRenderer.invoke('update:downloadAndInstall', url),
  downloadUpdate: (url) => ipcRenderer.invoke('update:download', url),
  shell: {
    openExternal: (url) => shell.openExternal(url),
  },
})