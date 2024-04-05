const express = require('express');
const router = express.Router();
const pagoController = require('../controllers/pagoController');

router.post('/registrarPago', pagoController.postRegistrarPago);

module.exports = router;


