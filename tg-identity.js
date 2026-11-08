// Если сайт открыт внутри Telegram (Mini App), запоминаем имя и @username посетителя на время сессии,
// чтобы владелец видел, чья заявка. Данные берутся из параметров запуска Telegram, не проверяются и не сохраняются на сайте.
(function(){
 try{
  var m=location.hash.match(/tgWebAppData=([^&]+)/);
  if(!m)return;
  var user=new URLSearchParams(decodeURIComponent(m[1])).get('user');
  if(!user)return;
  var u=JSON.parse(user);
  sessionStorage.setItem('tgUser',JSON.stringify({id:u.id,first:u.first_name||'',last:u.last_name||'',username:u.username||''}));
 }catch(e){}
})();
