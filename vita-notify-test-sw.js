/* Vita Test manual notification verification only. No servers, no keys, no cached user data. */
self.addEventListener('push', event => {
  if(!event.data) return;
  let v={}; try{v=event.data.json()}catch{return}
  if(v && v.kind==='vita-test-notification' && typeof v.title==='string') {
    event.waitUntil(self.registration.showNotification(v.title.slice(0,80), {body:String(v.body||'').slice(0,180),icon:'./vita-icon-512.png'}));
  }
});
self.addEventListener('notificationclick', event => {event.notification.close();event.waitUntil(self.clients.openWindow('./'));});
