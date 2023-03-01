const { connect, get_enviarmensaje, post_enviarmensaje, close } = require('../app/index');
const { Router } = require('express');
const router = Router();



router.get("/connect", connect)
router.get("/enviarmensaje", get_enviarmensaje);
router.get("/close", close);

router.post("/enviarmensaje", post_enviarmensaje);

module.exports = router;