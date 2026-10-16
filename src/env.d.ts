/// <reference types="astro/client" />

declare module 'astro' {
  interface AstroClientDirectives {
    /** Downloads the island's code with a progress bar, then hydrates (src/planner/boot/directive.ts). */
    'client:progress'?: boolean;
  }
}

export {};
