const tg = window.Telegram?.WebApp;

export function useTelegram() {
  const user = tg?.initDataUnsafe?.user;
  
  const onClose = () => {
    tg.close();
  };

  const onToggleButton = () => {
    if (tg.MainButton.isVisible) {
      tg.MainButton.hide();
    } else {
      tg.MainButton.show();
    }
  };

  return {
    onClose,
    onToggleButton,
    tg,
    user,
    queryId: tg?.initDataUnsafe?.query_id,
  };
}