const db = require('../util/database');

module.exports = class HistorialPago {
    static fetchAll() {
        return db.execute(`
            SELECT 
                deuda.Mes, 
                usuario.Referencia,
                usuario.Nombre, 
                pago.Fecha_de_pago, 
                pago.Cant_pagada, 
                deuda.Total_deuda, 
                (pago.Cant_pagada / deuda.Total_deuda) AS PorcentajePagado, 
                pago.Metodo, 
                pago.Banco, 
                pago.Nota
            FROM usuario
            JOIN pago ON usuario.IDUsuario = pago.IDUsuario
            JOIN deuda ON pago.IDDeuda = deuda.IDDeuda
            GROUP BY deuda.Mes, pago.IDPago, deuda.Total_deuda
            ORDER BY pago.Fecha_de_pago, deuda.Mes;
        `);
    }
    static getPaymentDetailsById(pagoId) {
        return db.execute(`
            SELECT 
                pago.IDPago,
                usuario.Referencia,
                usuario.Nombre,
                pago.Fecha_de_pago,
                pago.Cant_pagada,
                pago.Metodo,
                pago.Banco,
                pago.Nota,
                materias.Nombre_mat,
                materias.Creditos
            FROM pago 
            JOIN materias ON pago.IDDeuda = materias.IDMateria 
            WHERE pago.IDPago = ?
        `, [pagoId]);
    }
};

