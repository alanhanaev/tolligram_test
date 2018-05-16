var config = require("./config.json");
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
const cheerio = require('cheerio');
const axios = require("axios");
var redis = require("redis"),
    client = redis.createClient({ host: config.redis.host, port: config.redis.port, password: config.redis.password });


/** Функция обертка для отправки запросов через библиотеку axios */
async function request_axios(options) {
    return new Promise(async (resolve, reject) => {
        await axios.request(options)
            .then((val) => {
                if (val)
                    resolve(val)
                else
                    resolve({ status: 404, data: {} })
            })
            .catch((error) => {
                if (error.code === "ETIMEDOUT") {
                    resolve({ status: 404, data: {} })
                    return;
                }
                if (!error.response) {
                    resolve({ status: 404, data: {} })
                    return;
                }
                if (error) resolve(error.response);
            });
    });
}

/** Функция обертка для промисификации метода get */
async function promisify_get_key(key) {
    return new Promise( async (resolve, reject) => {
        client.get(key, function (err, reply) {
            if (!err) 
                resolve(reply);
                else
                reject(err);
        });
    })
}

/** Функция обертка для промисификации метода set */
async function promisify_set_expire_key(key, value, seconds) {
    return new Promise( async (resolve, reject) => {
        client.set(key, value, 'EX', seconds, (err, reply) => {
            if (!err) 
                resolve(reply);
                else
                reject(err);
        });
    })
}

app.use(bodyParser());
var router = express.Router();


router.post("/get_user_info", async function (req, res) {
    try {
        var proxy_login = req.body.login;
        var proxy_password = req.body.password;
        var proxy_host = req.body.host;
        var proxy_port = req.body.port;
        var user_id = req.body.user_id;
        if (proxy_login && proxy_password && proxy_host && user_id) {
            var cashed_object=await promisify_get_key(user_id);
            if (!cashed_object) {
                var response = await request_axios({
                    method: "get",
                    baseURL: "http://www.instagram.com/" + user_id,
                    proxy: {
                        host: proxy_host,
                        port: proxy_port,
                        auth: {
                            username: proxy_login,
                            password: proxy_password
                        }
                    }
                })
                if (response.status !== 200 || (!response.data)) throw new Error("");
                var $ = cheerio.load(response.data)
                var script_html = $("body script")[0].childNodes[0].data;
                var text_object = script_html.match(/{(.*)}/)[0];
                var parsed_object = JSON.parse(text_object);
                res.json({ success: true, value: parsed_object});
                promisify_set_expire_key(user_id, JSON.stringify(parsed_object), 21600);
            }
            else
                res.json({ success: true, value: JSON.parse(cashed_object)});
        }
        else throw new Error("");
    }
    catch (e) {
        res.json({ success: false, error_msg: "Ошибка выполнения запроса" });
    }
});


app.use('/', router);
app.listen(config.server_port);

console.log('App is running on the port: ' + config.server_port);