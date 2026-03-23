/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  ShortenerLinks: KVNamespace;
  DB: D1Database;
  LOGOS_BUCKET: R2Bucket;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET?: string;
}

// Extend the global namespace for Cloudflare Pages Functions
declare global {
  namespace NodeJS {
    interface ProcessEnv extends CloudflareEnv {}
  }
}

// For use with getRequestContext in Cloudflare Pages Functions
declare module "@cloudflare/next-on-pages" {
  export function getRequestContext(): {
    env: CloudflareEnv;
    ctx: ExecutionContext;
  };
}

export {};