const {
    WAConnection,
    MessageType,
    Mimetype,
    ReconnectMode,
    waChatKey,
} = require('@adiwajshing/baileys');
const { getIPs, sleep } = require('./utilities');
const { database } = require("./firebase-extras");
const { getUsers, pushUsers} = require("./database");
const { ref, set, get, update, push, onValue } = require('@firebase/database');
const fs = require("fs");
const { async } = require('@firebase/util');


let conn = null // instantiate
const my_ip = getIPs().replaceAll(".", "_")
let authInfo = null; 
let responseMessages = [ ];


const indexClient = process.env.CLIENT_SLUG

// start registry on database
get(ref(database, '/clients'))
    .then(postSnapshot => {
        let data = postSnapshot.val()
        if (!data)
            data = {}
        if (!data[indexClient])
            data[indexClient] = {}
        if (!data[indexClient].hasOwnProperty("name"))
            data[indexClient].name = process.env.CLIENT_NAME
        if (!data[indexClient].hasOwnProperty("pods"))
            data[indexClient].pods = {}
        if (!data[indexClient].pods[my_ip])
            data[indexClient].pods[my_ip] = { qrData: '', date: Date.now() }
        if (!data[indexClient].hasOwnProperty("responses")) {
            data[indexClient].responses = [ { keys: [ "hola", "buenas", "saludos", "buenos dias" ], response: "Hola, en un momento lo atendemos" } ]
            responseMessages = []
        } else
            responseMessages = data[indexClient].responses;

        console.log(data)
        set(ref(database, '/clients'), data)
            .then(() => console.log( "Base de datos leída exitosamente"))
            .catch(reason => console.log(reason))
    })
    .catch(reason => console.log(reason))

    let processingHealthCheck = false
    const healthcheck = async (req, res) => {
        let reasonFail = "No existe una sesión de Whatsapp",
            codeStatus = 500,
            resSended = false
        if (!processingHealthCheck) {
            processingHealthCheck = true
            if (authInfo == null) {
                await connect_wppaccount(req, null, (status) => {
                    if (status === "open") {
                        codeStatus = 200
                        reasonFail = "Funcionando"
                    }
                    if (!resSended) {
                        res.status(200).send({ code: codeStatus, msg: reasonFail, data: { } });
                        console.log("Open sended")
                        resSended = true
                    }
                    processingHealthCheck = false
                    update(ref(database, `/clients/${indexClient}/pods/${my_ip}`), { codeStatus, date: Date.now() })
                        .then(() => console.log("Updated counts"))
                        .catch(reason => console.log(reason))
                }, (cod, msg) => {
                    codeStatus = cod
                    reasonFail = msg
                    update(ref(database, `/clients/${indexClient}/pods/${my_ip}`), { codeStatus, date: Date.now() })
                        .then(() => console.log("Updated status"))
                        .catch(reason => console.log(reason))
                    processingHealthCheck = false
                    console.log(msg)
                    if (resSended === false) {
                        res.status(200).send({ code: codeStatus, msg: reasonFail, data: { } });
                                    console.log("Fail sended")
                    }
                    // close(null, null, null)
                    resSended = true
                })
            } else {
                // conn.off("qr")
                update(ref(database, `/clients/${indexClient}/pods/${my_ip}`), { codeStatus: 200, date: Date.now() })
                    .then(() => console.log("Updated status"))
                    .catch(reason => console.log(reason))
                res.status(200).send({ code: 204, msg: "Sesion existente", data: { } });
            }
        } else
            res.status(200).send({ code: 507, msg: "Procesando sesion", data: { } });
        // if (!conn) {
        //     codeStatus = 503
        //     reasonFail = "Connection no inicializada"
        // } else
    }

const connect = async (req, res) => connect_wppaccount(req, res, null, null)

let retrieQr = 0
const connect_wppaccount = async (req, res, callback, errcallback) =>  {
    let resSended = false
    if(conn != null) {
        conn.removeAllListeners("qr")
        conn.removeAllListeners("close")
        conn.removeAllListeners("open")
        conn.connectOptions.maxRetries = 10
    } else {
        conn = new WAConnection();
        conn.autoReconnect = ReconnectMode.onConnectionLost // only automatically reconnect when the connection breaks
        conn.logger.level = 'error' // set to 'debug' to see what kind of stuff you can implement
        conn.connectOptions.maxRetries = 10
        conn.chatOrderingKey = waChatKey(true) // order chats such that pinned chats are on top
    }

   

    if (conn.state !== "open" && conn.state !== "connecting") {
        let resSended = false;
        if(fs.existsSync('./auth_info.json')){
        conn.loadAuthInfo ('./auth_info.json')  
        }
       
        conn.on("qr", QR => {
            retrieQr++;
            if (retrieQr >= 10) {
                retrieQr = 0
                conn = null
                authInfo = null
                processingHealthCheck = false
            }
            update(ref(database, `/clients/${indexClient}/pods/${my_ip}`), { qrData: QR, date: Date.now() })
                .then(() => console.log("Escaneando código QR..."))
                .catch(reason => console.log(reason))
            if (errcallback != null) {
                errcallback(505, "Generating QR")
            }
            if (!resSended) {
                if (req.query.hasimage) {
                    const imageBuffer = Buffer.from(QR, 'base64');
                    if (res) {
                        res.writeHead(200, {
                            'Content-Type': 'image/png',
                            'Content-Length': imageBuffer.length
                        });
                        res.end(imageBuffer);
                    }
                } else
                    if (res)
                        res.status(200).json({msg: "Qr generated success", data: { qr: QR }})
            }
            resSended = true;
        });
        conn.on("close", async () => {
            await close(null, null, null)
            if (errcallback != null) {
            errcallback(403, "Coneccion cerrada")
            }
        })
        conn.on("ws-close", async () => {
            await close(null, null, null)
            if (errcallback != null) {
            errcallback(403, "WS Coneccion cerrada")
            }
        })
        conn.on("open", () => {
            if (callback !== null)
                callback("open")
            conn.removeAllListeners("qr")
            if (!resSended && res) {
                res.status(200).json({ msg: "Sesion conectada correctamente", data: {} })
                resSended = true;
            }
        })
          // Listener to chat update
          conn.on('chat-update', onReceiveMessage);
        await conn.connect().then(() => {
            // credentials are updated on every connect
            conn.removeAllListeners("qr")
            authInfo = conn.base64EncodedAuthInfo() // get all the auth info we need to restore this session
            console.log("Conectado!")
            fs.writeFileSync('./auth_info.json', JSON.stringify(authInfo, null, '\t')) // save this info to a file
            if (callback !== null)
                callback("open")
            if (!resSended && res) {
                res.status(200).json({ msg: "Sesion conectada correctamente", data: {} })
                console.log("Success connect")
                resSended = true;
            }
        }).catch(err => {
            console.log(err)
            if (errcallback !== null)
                errcallback(302, "Fallo al conectar")
            if (!resSended && res) {
                res.status(500).json({ msg: err, data: {} })
                console.log("Error to connect")
                resSended = true;
            }
        });

      
    } else {
        conn.removeAllListeners("qr")
        if (!resSended && res) {
            res.status(200).json({ msg: "Sesion existente", data: {} })
            if (callback !== null)
            callback("open")
            resSended = true;
        }
    }
}

const onReceiveMessage = async (chatUpdate) => {
    if (responseMessages.length == 0) return;
    if (chatUpdate.hasNewMessage) {
        if (chatUpdate.messages && chatUpdate.count) {
            // If messages are updated
            const messages = chatUpdate.messages.all();
            messages.forEach(async message => {
                responseMessages.forEach(async response => {
                    response.keys.forEach(async key => {
                        if (message.message.conversation.toLowerCase().includes(key.toLowerCase())) {
                            conn.sendMessage(
                                chatUpdate.jid, 
                                response.response,
                                MessageType.text,
                            ).then(() => console.log(`Respuesta enviada ${response.response} correctamente a ${chatUpdate.jid}`))
                            .catch(err => console.log(err));
                            await conn.chatRead(chatUpdate.jid)
                        }
                    })
                })
            });
        } else
            console.log("Mensajes enviados exitosamente!")
    }
}
const sendMessage = async (params, res, status) => {
    let sendedMessage = false,
        sendedFile = 'Not Required',
        resSended = false,
        reasonFailMessage = "",
        reasonFailFile = "",
        codeStatus = 200,
        dataRes = { msg: "Mensaje enviado correctamente", data: {} }
    if (conn) {
        if (conn.state != "open") {
            reasonFailMessage = reasonFailFile = "Session no conectada"
            codeStatus = 500
            dataRes = { msg: "Session no conectada", data: {} }
            resSended = true
        } else {
            getUsers(async users => {
                
                for (i = 0; i < users.length; i++) {
                    const user = users[i]
                    await sleep(15000)
                    const id = `591${user.phone}@s.whatsapp.net`;
                    conn.sendMessage (id, user.message, MessageType.text)
            .then(async() => {
                sendedMessage = true
                if (params.urlfile && params.filename || params.filename && params.base64Data) {
                    let urlFile = params.base64Data ? params.base64Data : params.urlfile;
                    conn.sendMessage(
                        id, 
                        { url: urlFile },
                        MessageType.document, 
                        { mimetype: Mimetype.pdf, caption: "", filename: params.filename }
                    ).then(() => {
                        sendedFile = true
                        if (!resSended) {
                            resSended = true
                            codeStatus = 200
                            dataRes = { msg: "Enviado Correctamente" }
                            res.status(codeStatus).json(dataRes)
                        }
                        // statusSended(users, codeStatus, dataRes, sendedMessage, reasonFailMessage, sendedFile, reasonFailFile);
                    }).catch(err => {
                        sendedFile = false
                        console.log(err)
                        if (!resSended) {
                            resSended = true
                            reasonFailFile = "No se pudo enviar el archivo"
                            codeStatus = 500
                            dataRes = { msg: "Ocurrio un error desconocido", data: err }
                            res.status(codeStatus).json(dataRes)
                        }
                       // pushMessageSended(params, codeStatus, dataRes, sendedMessage, reasonFailMessage, sendedFile, reasonFailFile);
                    });
                } else {
                    if (!resSended) {
                        res.status(codeStatus).json(dataRes)
                        resSended = true
                    }
                    codeStatus = 200
                    reasonFailMessage = ""
                    sendedFile = "Not Require"
                    reasonFailFile = "Not Require"
                   // pushMessageSended(params, codeStatus, dataRes, sendedMessage, reasonFailMessage, sendedFile, reasonFailFile);
                }
            })
            .catch(err => {
                console.log(err)
                if (err) {
                    sendedMessage = false
                    reasonFailMessage = "No se pudo enviar el mensaje"
                    resSended = true
                    codeStatus = 500
                    dataRes = { msg: "Ocurrio un error desconocido", data: err }
                }
                if (!resSended) {healthcheck
                    res.status(codeStatus).json(dataRes)
                    resSended = true
                }
              // pushMessageSended(params, codeStatus, dataRes, sendedMessage, reasonFailMessage, sendedFile, reasonFailFile);
            })
                }
              })
        }
    } else {
        reasonFailMessage = reasonFailFile = "Conn no inicializado"
        codeStatus = 500
        dataRes = { msg: "Conn no inicializado", data: {} }
        res.status(codeStatus).json(dataRes)
    }
}

const statusSended = (user, codeStatus, dataRes, sendedMessage, reasonFailMessage, sendedFile, reasonFailFile) => {
   
}

const get_enviarmensaje = async  (req, res, next)  =>
    sendMessage(req.query, res)

const post_enviarmensaje = async (req, res, next) =>
    sendMessage(req.body, res)

const close = async (req, res, next) => {
    if (fs.existsSync('./auth_info.json'))
         fs.rmSync('./auth_info.json')
    if (authInfo != null)
        authInfo = null
    if (conn.state == "open" || conn.state == "connecting") {
        await conn.close()
        conn = null
    }
    retrieQr = 0
    processingHealthCheck = false
    if (res !== null)
        res.jsonp({ msg: "Sesion cerrada con exito", data: {} });
}

module.exports = {
    healthcheck,
    connect,
    get_enviarmensaje,
    post_enviarmensaje,
    close,
    statusSended,
}