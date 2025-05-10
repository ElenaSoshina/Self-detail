interface TelegramWebApp {
  initDataUnsafe: {
    user?: {
      id: number;
      username?: string;
    };
  };
  ready: () => void;
}

declare global {
  interface Window {
    Telegram: {
      WebApp: TelegramWebApp;
    };
  }
} 