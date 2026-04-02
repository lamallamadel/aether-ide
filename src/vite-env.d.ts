/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Build desktop Electron : `base` Vite = `./` */
  readonly VITE_DESKTOP?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
