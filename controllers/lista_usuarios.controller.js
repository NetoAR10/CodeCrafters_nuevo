const ListaUsuario = require('../models/lista_usuarios.model');
const Usuario = require('../models/usuario.model');
const adminClient = require('../util/api_clients/adminApiClient');
const nodemailer = require('nodemailer');

exports.get_listUsers = (request, response, next) => {
    ListaUsuario.getVariosRol()
    .then(([rolesUser, fieldData]) => {
        const lista = rolesUser[0];
        // console.log(lista.Tipo_Rol);
        response.render('lista_usuarios', {
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

    })
}

exports.get_buscar = (request, response, next) => {
    ListaUsuario.search(request.params.valor_busqueda || '')
    .then(([usuariosDB, fieldData]) => {
        return response.status(200).json({usuariosDB: usuariosDB})
    })
    .catch((error) => {console.log(error)});
}

exports.post_desactivar = (request, response, next) => {
    ListaUsuario.desactivar(request.body.correo)
    .then(() => {
        ListaUsuario.getVariosRol()
        .then(([usuariosDB, fieldData]) => {
            return response.status(200).json({usuariosDB: usuariosDB})
        })
        .catch((error) => {console.log(error)})
    })
    .catch((error) => {console.log(error)});
}

exports.post_reactivar = (request, response, next) => {
    ListaUsuario.reactivar(request.body.correo)
    .then(() => {
        ListaUsuario.getVariosRol()
        .then(([usuariosDB, fieldData]) => {
            return response.status(200).json({usuariosDB: usuariosDB})
        })
        .catch((error) => {console.log(error)})
    })
    .catch((error) => {console.log(error)});
}

exports.get_modificarRol = (request, response, next) => {
    ListaUsuario.individualUsers(request.params.correo)
    .then(([rolesUser, fieldData]) => {
        const lista = rolesUser[0];
        console.log('Lista:', lista);
        response.render('modificar_rol.ejs', {
            usuariosDB: lista,
            nombre: request.session.nombre || '',
            matricula: request.session.matricula || '',
            correo: request.session.correo || '',
            beca: request.session.beca || '',
            rolUser: lista.Tipo_Rol || '',
            permisos: request.session.permisos || [] ,
            rol: request.session.roles || '',
            csrfToken: request.csrfToken(),
        })
    })
}

exports.post_modificarRol = (request, response, next) => {
    const nuevo_rol = request.body.nuevo_rol;
    const IDUsuario = request.body.IDUsuario;
    console.log('Body:', request.body);
    console.log('Rol nuevo:', nuevo_rol);
    ListaUsuario.modificarRol(nuevo_rol, IDUsuario)
    response.redirect('/user/admin/usuarios');
}


exports.post_actualizar = async (request, response, next) => {
    
    const transporter = nodemailer.createTransport({
        pool: true,
        service: 'gmail',
        auth: {
            user: 'testing20242304@gmail.com',
            pass: 'mwks ltuh hxmm fwcc',
        },
    });
    
    try {
        const APIUsers = await adminClient.getAllUsers();
        // console.log(APIUsers);
        
        const datosAPI = APIUsers.data.map(APIUsers => {
            
            const {
                name = '',
                first_surname = '',
                second_surname = '',
                ivd_id = 0,
                email = '',
                role = {}
            } = APIUsers;
            
            const {
                description = '',
            } = role;
            
            return {
                name: name.replace(/"/g, "'"),
                first_surname,
                second_surname,
                ivd_id,
                description,
                email: email.replace(/"/g, "'"),
            };
        })
        // console.log(datosAPI);
        
        //Comparaciones 
        
        Usuario.fetchAll().then(([users, fieldData]) => {
            const normalizedMails = users.map(users => users.Correo_electronico);
            const normalizedNames = users.map(users => users.Nombre);
            const normalizedIDs = users.map(users => users.Matricula);
            
            datosAPI.forEach(user => {
                const {
                    name, first_surname, second_surname, ivd_id, description, email
                } = user;
                let fullName = `${name} ${first_surname} ${second_surname}`;
                console.log('Nombre completo:', fullName, 'Correo:', email);

                if(normalizedIDs.includes(ivd_id) && normalizedMails.includes(email) && normalizedNames.includes(fullName)){
                    console.log('En base de datos:', fullName, email, ivd_id, description);

                } else {
                    if (description !== 'Profesor'){
                        console.log('Debe actualizarse la base:', fullName, email, description);
                        //Si el nombre está mal
                        if(normalizedIDs.includes(ivd_id) && normalizedMails.includes(email)){
                            console.log('El nombre debería ser:', fullName, '. Actualizando...');
                            Usuario.updateName(fullName, email, ivd_id);
                        //Si el correo está mal
                        } else if (normalizedIDs.includes(ivd_id) && normalizedNames.includes(fullName)){
                            console.log('El correo debería ser:', email, '. Actualizando...')
                            Usuario.updateEmail(email, fullName, ivd_id);
                        //Si la matrícula está mal
                        } else if (normalizedMails.includes(email) && normalizedNames.includes(fullName)){
                            console.log('La matrícula debería ser:', ivd_id, '. Actualizando...');
                            Usuario.updateID(ivd_id, email, fullName);
                        } else{
                            console.log(`Ingresando ${email} dentro de la base de datos`)
                            const nuevo_usuario = new Usuario(fullName, ivd_id, email);
                            nuevo_usuario.save();

                        }
                    }
                }
                    
            })
    
                // Enviar correos a usuarios sin contraseña
    
                Usuario.contrasenaIsNull().then(([correosSC, fieldData])=> {
                    
                    for (let i = 0; i < correosSC.length; i++){
                        console.log('Longitud correo:' , correosSC.length , 'Iteración: ', i);
                        setTimeout(() => {
                            
                            const generateResetToken = () => {
                                
                                return require('crypto').randomBytes(32).toString('hex');
                                
                            }
                            const altaToken = generateResetToken();
                            const email = correosSC[i].Correo_electronico;
                            const altaURL = `http://localhost:2050/user/dar_alta/${email}/${altaToken}`;
                            const mailOptions = {
                                from: 'testing20242304@gmail.com',
                                to: correosSC[i].Correo_electronico,
                                subject: 'Registra tu cuenta',
                                text: `Para darte de alta en el sistema de ViaDiseño, haz clic en el siguiente link.
                                
                                ${altaURL}`,
                            };
                            
                            transporter.sendMail(mailOptions, (error, info) => {
                                if (error) {
                                    console.log(error);
                                    
                                } else {
                                    console.log('Email sent: ' + info.response);
                                }
                            }); 
    
                        }, 1000);
                    }
                    
                    
                })
        }).catch((error) => {
            console.log(error);
        })
    }
    
    catch (error) {
        console.log(error);
    }
}

exports.get_darAlta = (request, response, next) => {
    response.render('dar_alta.ejs', {
        correo: request.params.correo,
        feedback: request.session.feedback,
        resetToken: request.params.resetToken,
    });
}

exports.post_darAlta = (request, response, next) => {
    const correo = request.body.correo;
    const new_password = request.body.new_password;
    const resetToken = request.body.resetToken;
    request.session.errorValueConfirm = false;
    request.session.passwordReset = false;
    // console.log('new password:', new_password);
    // console.log('session email:', correo);
    const confirmar = request.body.confirmpassword;
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

    // console.log('Token:' , resetToken);

    if (confirmar !== request.body.new_password) {
        request.session.feedback = 'No has confirmado tu contraseña correctamente. Intenta de nuevo.';
        request.session.errorValueConfirm = true;
        return response.redirect(`/user/dar_alta/${correo}/${resetToken}`);
    } else if (!passwordRegex.test(request.body.new_password)) {
        request.session.feedback = 'Tu contraseña debe contener al menos 8 caracteres, un número y una mayúscula.';
        request.session.errorValueRegex = true;
        console.log(new_password);
        return response.redirect(`/user/dar_alta/${correo}/${resetToken}`);

    } else {
        Usuario.cambiar(new_password, correo).then(()=> {
            request.session.feedback = 'Has dado de alta tu contraseña con éxito.';
            response.redirect(`/user/dar_alta/${correo}/${resetToken}`)
        }).catch((error)=>{console.log(error)})
    }
}   


exports.post_editarRef = (request, response, next) => {
    const referencia = request.body.reference;
    const correo = request.body.correo;
    ListaUsuario.getVariosRol().then(([usuariosDB, fieldData]) => {
        ListaUsuario.editarReferencia(referencia, correo)
        .then(() => {
            console.log('Exito');
            console.log('Valor correo:', request.body.correo);
            console.log('Valor Referencia:', request.body.reference);
            return response.status(200).json({usuariosDB: usuariosDB})
        })
        .catch((error) => {
            console.log(error)
            console.log('Valor correo:', request.body.correo);
            console.log('Valor Referencia:', request.body.content);
        });

    }).catch((error) => {
        console.log(error);
        console.log('Valor correo:', request.body.correo);
    })
}

exports.post_editarBeca = (request, response, next) => {
    const beca = request.body.beca;
    const correo = request.body.correo;
    ListaUsuario.getVariosRol().then(([usuariosDB, fieldData]) => {
        ListaUsuario.editarBeca(beca, correo)
        .then(() => {
            console.log('Exito');
            console.log('Valor correo:', request.body.correo);
            console.log('Valor Beca:', request.body.beca);
            return response.status(200).json({usuariosDB: usuariosDB})
        })
        .catch((error) => {
            console.log(error)
            console.log('Valor correo:', request.body.correo);
            console.log('Valor Beca:', request.body.beca);
        });

    }).catch((error) => {
        console.log(error);
        console.log('Valor correo:', request.body.correo);
    })
}