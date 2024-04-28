const ListaUsuario = require('../models/pagos_de_alumnos.model');

exports.get_listUsers = (request, response, next) => {
    ListaUsuario.getVariosRol()
    .then(([rolesUser, fieldData]) => {
        const lista = rolesUser[0];
        response.render('pagos_de_alumnos', {
            usuariosDB: rolesUser,
            nombre: request.session.nombre || '',
            matricula: request.session.matricula || '',
            correo: request.session.correo || '',
            beca: request.session.beca || '',
            rolUser: lista.Tipo_Rol || '',
            permisos: request.session.permisos || [] ,
            rol: request.session.roles || '',
            csrfToken: request.csrfToken(),

        })
        console.log(lista.Tipo_Rol);
    })
}

exports.get_buscar = (request, response, next) => {
    ListaUsuario.search(request.params.valor_busqueda || '')
    .then(([usuariosDB, fieldData]) => {
        return response.status(200).json({usuariosDB: usuariosDB})
    })
    .catch((error) => {console.log(error)});
}

exports.getHistorialDePagos = (request, response, next) => {
    console.log('Controlador getHistorialDePagos invocado.');
    const Matricula = request.params.id; 

    ListaUsuario.historialDePagos(Matricula)
    .then(([data, fieldData]) => {
        response.render('historial_pagos', {
            pagos: data,
            nombre: request.session.nombre || '',
            correo: request.session.correo || '',
	    matricula: request.session.matricula || '',
            permisos: request.session.permisos || [],
            rol: request.session.roles || '',   
        });
    })
    .catch(error => {
        console.log(error);
        response.status(500).send("Ocurrió un error al recuperar el historial de pagos");
    });
}

exports.getHistorialDeDeudas = (request, response, next) => {
    console.log('Llendo al historial de deudas');
    const Matricula = request.params.id;

    ListaUsuario.historialDeDeudas(Matricula)
    .then(([data, fieldData]) => {
        response.render('historial_deudas', {
            deuda: data,
            nombre: request.session.nombre || '',
	    correo: request.session.correo || '',
	    matricula: request.session.matricula || '',
	    permisos: request.session.permisos || [],
	    rol: request.session.roles || '',
        });
    })
    .catch(error => {
	console.log(error);
	response.status(500).send("Ocurrió un error al recuperar el historial de deudas");
    });
};

exports.infoDeuda = async (request, response, next) => { 
    const Matricula = request.params.id; 
    try {
        const [deudaDetails] = await ListaUsuario.infoDeuda(Matricula);
        if (deudaDetails.length > 0) {
            response.render('crearDeuda', {
                deuda: deudaDetails[0],
                titulo: 'crearDeuda',
		matricula: request.session.permisos,
	        correo: request.session.permisos,
		permisos: request.session.permisos,
		rol: request.session.roles,
		nombre: request.session.nombre,
		csrfToken: request.csrfToken(),
            });
        } else {
            response.status(404).send('Error al crear Deuda');
        }
    } catch (error) {
        console.error('Error al crear deuda:', error);
        response.status(500).send('Error al crear Deuda');
    }
};
