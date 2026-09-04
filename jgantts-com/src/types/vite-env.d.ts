/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Define your environment variables here
  readonly VITE_APP_TITLE: string;
  // Add more environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
