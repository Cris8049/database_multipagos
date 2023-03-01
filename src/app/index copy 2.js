const {
  DisconnectReason,
  useSingleFileAuthState,
} = require("@adiwajshing/baileys");
const makeWASocket = require("@adiwajshing/baileys").default;
const { getIPs, sleep } = require("./utilities");
const { database } = require("./firebase-extras");
const { getUsers } = require("./database");
const { ref, set, get, update, push, onValue } = require("@firebase/database");
const fs = require("fs");
const { async } = require("@firebase/util");

let sock = null;
const my_ip = getIPs().replaceAll(".", "_");
let authInfo = null;
let responseMessages = [];

const indexClient = process.env.CLIENT_SLUG;

get(ref(database, "/clients"))
  .then((postSnapshot) => {
    let data = postSnapshot.val();
    if (!data) data = {};
    if (!data[indexClient]) data[indexClient] = {};
    if (!data[indexClient].hasOwnProperty("name"))
      data[indexClient].name = process.env.CLIENT_NAME;
    if (!data[indexClient].hasOwnProperty("pods")) data[indexClient].pods = {};
    if (!data[indexClient].pods[my_ip])
      data[indexClient].pods[my_ip] = { qrData: "", date: Date.now() };
    if (!data[indexClient].hasOwnProperty("responses")) {
      data[indexClient].responses = [
        {
          keys: ["hola", "buenas", "saludos", "buenos dias"],
          response: "Hola, en un momento lo atendemos",
        },
      ];
      responseMessages = [];
    } else responseMessages = data[indexClient].responses;

    console.log(data);
    set(ref(database, "/clients"), data)
      .then(() => console.log("Base de datos leída exitosamente"))
      .catch((reason) => console.log(reason));
  })
  .catch((reason) => console.log(reason));

const connect = function (req, res) {
  const { state, saveState } = useSingleFileAuthState("./auth_info_multi.json");
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });
  sock.ev.on("creds.update", saveState);
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;
      console.log(
        "connection closed due to " +
          lastDisconnect.error +
          ", reconnecting " +
          shouldReconnect
      );
      if (shouldReconnect) {
        connect();
      }
    } else if (connection === "open") {
      console.log("Conectado a WA!");
      res.send({ msg: "Conectado a WA!" });
    }
  });
};
const sendMessage = async (params, res, status) => {
  let sendedMessage = false,
    sendedFile = "Not Required",
    resSended = false,
    reasonFailMessage = "",
    reasonFailFile = "",
    codeStatus = 200,
    dataRes = { msg: "Mensaje enviado correctamente", data: {} };
  if (sock) {
    getUsers(async (users) => {
      for (i = 0; i < users.length; i++) {
        const user = users[i];
        await sleep(40000);
        const id = `591${user.phone}@s.whatsapp.net`;
        sock
          .sendMessage(id, { text: user.message })
          .then(async () => {
            sendedMessage = true;
            await sock
              .sendMessage(id, {
                image: { url: user.img },
                caption: "",
              })
              .then(() => {
                sendedFile = true;
                if (!resSended) {
                  resSended = true;
                  codeStatus = 200;
                  dataRes = { msg: "Enviado Correctamente" };
                  res.status(codeStatus).json(dataRes);
                }
                // statusSended(users, codeStatus, dataRes, sendedMessage, reasonFailMessage, sendedFile, reasonFailFile);
              })
              .catch((err) => {
                sendedFile = false;
                console.log(err);
                if (!resSended) {
                  resSended = true;
                  reasonFailFile = "No se pudo enviar el archivo";
                  codeStatus = 500;
                  dataRes = { msg: "Ocurrio un error desconocido", data: err };
                  res.status(codeStatus).json(dataRes);
                }
                // pushMessageSended(params, codeStatus, dataRes, sendedMessage, reasonFailMessage, sendedFile, reasonFailFile);
              });
          })
          .catch((err) => {
            console.log(err);
            if (err) {
              sendedMessage = false;
              reasonFailMessage = "No se pudo enviar el mensaje";
              resSended = true;
              codeStatus = 500;
              dataRes = { msg: "Ocurrio un error desconocido", data: err };
            }
            if (!resSended) {
              healthcheck;
              res.status(codeStatus).json(dataRes);
              resSended = true;
            }
            // pushMessageSended(params, codeStatus, dataRes, sendedMessage, reasonFailMessage, sendedFile, reasonFailFile);
          });
      }
    });
  } else {
    reasonFailMessage = reasonFailFile = "Conn no inicializado";
    codeStatus = 500;
    dataRes = { msg: "Conn no inicializado", data: {} };
    res.status(codeStatus).json(dataRes);
  }
};

const statusSended = (
  user,
  codeStatus,
  dataRes,
  sendedMessage,
  reasonFailMessage,
  sendedFile,
  reasonFailFile
) => {};

const get_enviarmensaje = async (req, res, next) => sendMessage(req.query, res);

const post_enviarmensaje = async (req, res, next) => sendMessage(req.body, res);

const close = async (req, res, next) => {
  if (fs.existsSync("./auth_info.json")) fs.rmSync("./auth_info.json");
  if (authInfo != null) authInfo = null;
  if (sock.state == "open" || sock.state == "connecting") {
    await sock.close();
    sock = null;
  }
  retrieQr = 0;
  processingHealthCheck = false;
  if (res !== null) res.jsonp({ msg: "Sesion cerrada con exito", data: {} });
};

module.exports = {
  connect,
  get_enviarmensaje,
  post_enviarmensaje,
  close,
  statusSended,
};
