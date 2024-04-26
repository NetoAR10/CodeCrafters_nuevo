const ListaUsuario = require('../models/lista_usuarios.model');
const Usuario = require('../models/usuario.model');
const adminClient = require('../util/api_clients/adminApiClient');
const nodemailer = require('nodemailer');

exports.get_listUsers = (request, response, next) => {
    ListaUsuario.getVariosRol()
    .then(([rolesUser, fieldData]) => {
        const lista = rolesUser[0];
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
            } = APIUsers;
            
            return {
                name,
                first_surname,
                second_surname,
                ivd_id,
                email: email.replace(/"/g, "'"),
            };
        })
        // console.log(datosAPI);
        
        
        Usuario.fetchAllMails().then(([mails, fieldData]) => {
            const normalizedMails = mails.map(mail => mail.Correo_electronico.replace(/"/g, "'"));
            
            datosAPI.forEach(user => {
                const {
                    name, first_surname, second_surname, ivd_id, email,
                } = user;
                if(normalizedMails.includes(email)){
                    console.log(`${email} está en la base de datos`)
                } else {
                    let fullName = `${name} ${first_surname} ${second_surname}`;
                    console.log('Nombre completo:', fullName, 'Correo:', email);
                    
                    
                    console.log(`Ingresando ${email} dentro de la base de datos`)
                    const nuevo_usuario = new Usuario(fullName, ivd_id, email);
                    nuevo_usuario.save();
                    
                }
                
            })

            //Enviar correos a usuarios sin contraseña

            // Usuario.contrasenaIsNull().then(([correosSC, fieldData])=> {
                
            //     for (let i = 0; i < correosSC.length; i++){
            //         console.log('Longitud correo:' , correosSC.length , 'Iteración: ', i);
            //         setTimeout(() => {
                        
            //             const generateResetToken = () => {
                            
            //                 return require('crypto').randomBytes(32).toString('hex');
                            
            //             }
            //             const altaToken = generateResetToken();
            //             const email = correosSC[i].Correo_electronico;
            //             const altaURL = `http://localhost:2050/user/dar_alta/${email}/${altaToken}`;
            //             const mailOptions = {
            //                 from: 'testing20242304@gmail.com',
            //                 to: correosSC[i].Correo_electronico,
            //                 subject: 'Registra tu cuenta',
            //                 text: `Para darte de alta en el sistema de ViaDiseño, haz clic en el siguiente link.
                            
            //                 ${altaURL}`,
            //             };
                        
            //             transporter.sendMail(mailOptions, (error, info) => {
            //                 if (error) {
            //                     console.log(error);
                                
            //                 } else {
            //                     console.log('Email sent: ' + info.response);
            //                 }
            //             }); 

            //         }, 1000);
            //     }
                
                
            // })
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
        resetToken: request.params.resetToken,
    });
}

exports.post_darAlta = (request, response, next) => {
    const correo = decodeURIComponent(request.body.correo);
    const new_password = request.body.new_password;
    // console.log('new password:', new_password);
    // console.log('session email:', correo);
    Usuario.cambiar(new_password, correo).then(()=> {
        response.redirect('/user/login')
    }).catch((error)=>{console.log(error)})
}