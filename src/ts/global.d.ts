/// <reference types="@league-of-foundry-developers/foundry-vtt-types" />

declare global {
  // Ensure game is recognized
  const game: Game;
  const canvas: Canvas;
  const ui: FoundryUI;
  const CONFIG: Config;
  const foundry: typeof globalThis.foundry;
  
  // Add any custom global types here
  interface Window {
    QuickInsert: {
      open: (context: any) => void;
      search: (text: string, filter?: ((item: any) => boolean) | null, max?: number) => Promise<any[]>;
      forceIndex: () => void;
      handleKeybind: (event: KeyboardEvent, context: any) => void;
      hasIndex: boolean;
    };
  }
}

export {};