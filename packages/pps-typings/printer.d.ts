declare namespace Printer {
  type TType = 'income' | 'return-of-income';

  type TSubjectSign =
    | 1   // Товар
    | 2   // Подакцизный товар (ФР должен быть зарегистрирован с признаком подакцизных товаров)
    | 3   // Работа
    | 4   // Услуга
    | 5   // Ставка азартной игры
    | 6   // Выигрыш азартной игры
    | 7   // Лотерейный билет
    | 8   // Выигрыш лотереи
    | 9   // Предоставление РИД
    | 10  // Платёж или Выплата
    | 11  // Агентское вознаграждение
    | 12  // Составной предмет расчёта
    | 13  // Иной предмет расчёта
    | 14  // Имущественное право
    | 15  // Внереализационный доход
    | 16  // Страховые взносы
    | 17  // Торговый сбор
    | 18; // Курортный сбор

  type TConfig = {
    headerText?: TCheckText;
    cashierName?: string;
  };
  
  type TCheckText = string[];
  
  type TTax = '20%' | '10%' | '20/120' | '10/110' | '0%' | 'Без НДС';
  
  type TPaymentMethod = 'cash' | 'card';

  type TCheckItem = {
    name: string; // Тестовый Товар
    count: number; // 1
    price: number; // 5100
    tax: TTax;
    subjectSign: TSubjectSign; // 4
    moySklad?: {
      id: string;
      type: 'product' | 'service';
    };
  };

  type TCheckParams = {
    type: TType;
    items: TCheckItem[];
    paymentMethod: TPaymentMethod;
    content?: TCheckText;
    withoutStoreIntegration?: boolean;
  };

  type TCorrectionOperationType = 'income' | 'outcome';

  type TCorrectionDocumentDate = [number, number, number]; // [год, месяц, число]

  type TCorrectionParams = {
    operationType: TCorrectionOperationType;
    isPrescribed?: boolean;
    amount: number;
    paymentMethod: TPaymentMethod;
    tax: TTax;
    documentName: string;
    documentDate: TCorrectionDocumentDate;
    documentNumber: string;
  };
}

export = Printer;
