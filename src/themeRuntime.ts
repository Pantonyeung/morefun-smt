export type SmtThemeId = 'sunrise' | 'rice' | 'zimi' | 'moss' | 'ocean' | 'night';

const THEMES: SmtThemeId[] = ['sunrise', 'rice', 'zimi', 'moss', 'ocean', 'night'];
const THEME_MODE_KEY = 'morefun.smt.theme-mode';
const THEME_ID_KEY = 'morefun.smt.theme-id';
const QUICK_MODE_KEY = 'morefun.smt.quick-mode';

function dailyTheme(): SmtThemeId {
  const now = new Date();
  const businessDate = new Date(now);
  if (businessDate.getHours() < 5) businessDate.setDate(businessDate.getDate() - 1);
  const start = new Date(businessDate.getFullYear(), 0, 0);
  const day = Math.floor((businessDate.getTime() - start.getTime()) / 86_400_000);
  return THEMES[Math.abs(day) % THEMES.length];
}

function isThemeId(value: string | null): value is SmtThemeId {
  return Boolean(value && THEMES.includes(value as SmtThemeId));
}

export function applySmtAppearance() {
  const root = document.documentElement;
  const mode = localStorage.getItem(THEME_MODE_KEY) === 'manual' ? 'manual' : 'auto_daily';
  const savedTheme = localStorage.getItem(THEME_ID_KEY);
  const theme = mode === 'manual' && isThemeId(savedTheme) ? savedTheme : dailyTheme();
  const quickMode = localStorage.getItem(QUICK_MODE_KEY) === 'true';

  root.dataset.theme = theme;
  root.dataset.themeMode = mode;
  root.dataset.quickMode = quickMode ? 'true' : 'false';
}

export function setSmtTheme(theme: SmtThemeId | 'auto_daily') {
  if (theme === 'auto_daily') {
    localStorage.setItem(THEME_MODE_KEY, 'auto_daily');
  } else {
    localStorage.setItem(THEME_MODE_KEY, 'manual');
    localStorage.setItem(THEME_ID_KEY, theme);
  }
  applySmtAppearance();
}

export function setSmtQuickMode(enabled: boolean) {
  localStorage.setItem(QUICK_MODE_KEY, String(enabled));
  applySmtAppearance();
}

export function getSmtAppearance() {
  return {
    theme: document.documentElement.dataset.theme as SmtThemeId | undefined,
    themeMode: document.documentElement.dataset.themeMode || 'auto_daily',
    quickMode: document.documentElement.dataset.quickMode === 'true',
  };
}

applySmtAppearance();

window.addEventListener('storage', (event) => {
  if ([THEME_MODE_KEY, THEME_ID_KEY, QUICK_MODE_KEY].includes(event.key || '')) applySmtAppearance();
});
