const app = require('./app');
const host = process.env.IP || '0.0.0.0'
const port = process.env.PORT || 8000;

app.listen(port, host, () => console.log(`Sistemas iniciados exitosamente
Servidor corriendo en el puerto ${port}`))