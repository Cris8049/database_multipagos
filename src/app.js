const express = require('express');
const bodyParser = require('body-parser');
const cors = require("cors")
const app = express();

app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
// Habilitamos las rutas
app.use(require('./routes/index'))

module.exports = app;