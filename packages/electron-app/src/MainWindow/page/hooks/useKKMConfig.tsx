import { h } from 'preact';
import { useEffect } from 'preact/hooks';
import { toast } from 'react-toastify';

import { useAdminToken } from '../components/TokenContext';
import useBookingApi from './useBookingApi';
import { sendConfig } from '../printer';
import getGlobal from '../get-global';

const { config: { WINSTRIKE_ID_URL } } = getGlobal();

function useKKMConfig () {
  const { token } = useAdminToken();
  const { request: { getUser } } = useBookingApi();

  useEffect(() => {
    if (token) {
      getUser()
        .then((user) => {
          if (!user.name) {
            showCashierNameError();
          } else {
            sendConfig({ cashierName: user.name })
              .catch(e => e === 'invalid cashier name' && showCashierNameError());
          }
        })
        .catch((e) => {
          const error = e.response?.data?.message || e.message;
          toast(
            `Не удалось загрузить данные пользователя. Ошибка ${error}`,
            { type: 'error', closeButton: false, closeOnClick: false, draggable: false },
          );
          toast(
            'Для работы с кассой необходимы данные кассира.',
            { type: 'error', closeButton: false, closeOnClick: false, draggable: false },
          );
        });
    }
  }, [token, getUser]);
}

function showCashierNameError () {
  toast(
    <span>
      У вас указано некорректное настоящее имя касссира.&#32;
      Имя кассира должно быть заполнено в таком формате: <b>Иванов А.Б.</b>&#32;
      Фамилия полностью, и инициалы с точками, без пробела между ними.&#32;
      Пожалуйста, укажите корректное имя в&#32;
      <a href={`${WINSTRIKE_ID_URL}/profile/edit`}>
        настройках профиля в Winstrike ID
      </a>, в поле "Настоящее имя", и перезапустите приложение.
    </span>,
    { type: 'error', closeButton: false, closeOnClick: false, draggable: false },
  );
}

export default useKKMConfig;
