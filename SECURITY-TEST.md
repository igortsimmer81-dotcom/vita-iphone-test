# Vita Test — проверка

Источник: закрытая ветка `recovery/vita-safe-rebuild-2026-10-23`, только веб-снимок, без серверной части.

- Отдельный origin GitHub Pages; отдельные ключи localStorage.
- Нет соединений с Railway, push, внешних JS и service worker.
- Импорт рабочих резервных копий заблокирован.
- Нет персональных данных; вводить только вымышленные записи.
- На iPhone тестировать независимо от рабочей Vita.
- Оригинальная ветка и Railway не изменялись.

Проверки кода: 
```json
{
  "productionStorageKeyAbsent": true,
  "productionSavingsKeyAbsent": true,
  "railwayAbsent": true,
  "externalUrls": [],
  "serviceWorkerDisabled": true,
  "backupImportDisabled": true,
  "testStorageKeys": [
    "vita_iphone_test_demo_v1",
    "vita_iphone_test_savings_v1"
  ]
}
```
