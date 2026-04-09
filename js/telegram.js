const tg = window.Telegram?.WebApp;

let backHandler = null;
let mainHandler = null;

export default {
  init() {
    if (!tg) return;
    tg.ready();
    tg.expand();

    if (tg.colorScheme === 'dark') {
      document.documentElement.classList.add('dark');
    }

    tg.setHeaderColor('secondary_bg_color');
    tg.setBackgroundColor('secondary_bg_color');
  },

  showBack(cb) {
    if (!tg) return;
    if (backHandler) tg.BackButton.offClick(backHandler);
    backHandler = cb;
    tg.BackButton.onClick(backHandler);
    tg.BackButton.show();
  },

  hideBack() {
    if (!tg) return;
    if (backHandler) tg.BackButton.offClick(backHandler);
    backHandler = null;
    tg.BackButton.hide();
  },

  showMain(text, cb) {
    if (!tg) return;
    if (mainHandler) tg.MainButton.offClick(mainHandler);
    mainHandler = cb;
    tg.MainButton.setText(text);
    tg.MainButton.onClick(mainHandler);
    tg.MainButton.show();
  },

  hideMain() {
    if (!tg) return;
    if (mainHandler) tg.MainButton.offClick(mainHandler);
    mainHandler = null;
    tg.MainButton.hide();
  },

  hapticLight() {
    tg?.HapticFeedback?.impactOccurred('light');
  },

  hapticMedium() {
    tg?.HapticFeedback?.impactOccurred('medium');
  },

  hapticSuccess() {
    tg?.HapticFeedback?.notificationOccurred('success');
  },

  hapticError() {
    tg?.HapticFeedback?.notificationOccurred('error');
  }
};
