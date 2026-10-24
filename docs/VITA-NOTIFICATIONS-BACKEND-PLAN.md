# Vita Test — фоновые напоминания: безопасная архитектура (2026-10-24)

## Текущий статус
- Установленная iOS PWA может показать ручное уведомление посредством Service Worker; тест пройден на iPhone.
- **Автоматическая доставка по времени, когда PWA закрыта, НЕ настроена.**
- Единственный существующий Supabase-проект пользователя называется `kassa-drive-master`: **не использовать его для Vita**.
- Рабочую Vita/Railway и реальные записи не изменять.

## Для запуска требуется отдельный backend
1. Отдельный Supabase-проект `vita-notifications-test` по явному согласию пользователя (создание нового проекта потенциально может влиять на биллинг).
2. Supabase Auth + приватные таблицы с RLS по `auth.uid() = user_id`: web_push_subscriptions (endpoint, p256dh, auth, user_id), reminder_jobs (user_id, task_id, due_at_utc, status, delivered_at, idempotency_key), event_log (user_id, event_type, timestamp).
3. Пара ключей VAPID: public key для клиента; private key только в Edge Function secret. Ни endpoint подписки, ни private key, ни финансовые записи не коммитить в GitHub.
4. Клиент: по действию пользователя `registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:...})`, затем отправка подписки через проверенную Auth API.
5. Серверная Edge Function: выбрать наступившие напоминания по UTC, пометить идемпотентно, отправить стандартный зашифрованный Web Push; обработать 404/410, временные ошибки и безопасные повторы.
6. Планировщик pg_cron + pg_net вызывает функцию через защищённый ключ из Vault. Учесть таймзону задачи при создании due_at_utc.
7. Не копировать в облако весь финансовый JSON: только явно выбранные тестовые напоминания и push-подписки.
8. Проверить end-to-end: создать вымышленную задачу, закрыть Vita Test, заблокировать iPhone, дождаться push, исключить дубли, проверить изменение и отмену.

## Критические гарантии
- Настройка push не меняет текущие ключи localStorage или структуру финансовых записей.
- Не выдавать ручную демонстрацию `showNotification` за серверный push.
- Нет публичной отправки push по чужим endpoint; требуется Auth и RLS.
- Перед запуском с реальными делами — резервное копирование и проверка доставки в закрытом приложении.

Документация: Apple Web Push (https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers), Supabase scheduled functions (https://supabase.com/docs/guides/functions/schedule-functions).
