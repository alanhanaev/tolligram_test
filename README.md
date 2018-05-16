Пример работы с Redis "Метод забирает данные пользователя в instagramm и кэширует их"
### Запрос на получение информации о пользователе  <br />
URL: /get_user_info  <br />
Json params:  <br />
```
{
    login: "Логин прокси",
    password: "Пароль прокси",
    host: "Адрес прокси хоста",
    port: "Адрес прокси порта"
    user_id: "Идентификатор пользователя instagramm"
}
```
Response: <br />
```
status code:200 
{
    success: true,
    value: {
        Объект с данными о пользователе instagramm
    }
}
либо 
status code:200 
{
    success: false,
    error_msg:""
}
```
