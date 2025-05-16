/**
 * utils/env.ts
 * -----------------------------------------
 * Утилиты для доступа к переменным окружения,
 * а также функции‑помощники для Telegram WebApp.
 *
 * ⚠️  Переменные с учётками «впекает» Vite
 *     при сборке, поэтому читаем ТОЛЬКО из
 *     import.meta.env.VITE_*.
 */

/* =========  BACKEND CREDENTIALS  ========= */

/** Логин, заданный через VITE_BACKEND_USERNAME */
export const getBackendUsername = (): string =>
  import.meta.env.VITE_BACKEND_USERNAME ?? '';

/** Пароль, заданный через VITE_BACKEND_PASSWORD */
export const getBackendPassword = (): string =>
  import.meta.env.VITE_BACKEND_PASSWORD ?? '';

/* ============  TELEGRAM WEBAPP  =========== */

/** Проверка, запущено ли приложение внутри Telegram WebApp */
export const isTelegramWebApp = (): boolean =>
  !!(window as any).Telegram?.WebApp;

/** Возвращает объект Telegram WebApp, если он доступен */
export const getTelegramWebApp = () => {
  if (isTelegramWebApp()) {
    return (window as any).Telegram.WebApp;
  }
  return null;
};

/** Инициализация Telegram WebApp: ready, тема, expand, disableVerticalSwipes */
export const initTelegramWebApp = (): void => {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.ready(); // сообщаем Telegram, что WebApp готов
    document.documentElement.classList.toggle(
      'dark-theme',
      tg.colorScheme === 'dark'
    );
    if (tg.expand) {
      tg.expand();
    }
    if (tg.disableVerticalSwipes) {
      tg.disableVerticalSwipes();
    }
  }
};
