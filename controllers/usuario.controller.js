const Usuario = require('../models/usuario.model');
const bcrypt = require ('bcryptjs');
const nodemailer = require('nodemailer');
const adminClient = require('../util/api_clients/adminApiClient');

exports.get_login = (request, response, next) => {
    const error = request.session.error || '';
    request.session.error = '';
    response.render('login', {
        correo: request.session.correo || '',
        matricula: request.session.matricula || 0,
        registrar: false,
        error: error,
        csrfToken: request.csrfToken(),
    });
};




exports.post_login = (request, response, next) => {
    
    Usuario.fetchOne(request.body.matricula)
    .then(([users, fieldData]) => {
        console.log(users);
        if(users.length == 1) {
            const user = users[0];
            if (!user.Contrasena) {
                request.session.error = 'La contraseña no está configurada para este usuario.';
                return response.redirect('/user/login');
            }
            bcrypt.compare(request.body.password, user.Contrasena)
            .then(doMatch => {
                if (doMatch) {
                    Usuario.getPermisos(user.Matricula).then(([permisos, fieldData]) => {
                        const rol = permisos[0];
                        request.session.isLoggedIn = true;
                        request.session.permisos = permisos;
                        request.session.correo = user.Correo_electronico;
                        request.session.matricula = user.Matricula;
                        request.session.nombre = user.Nombre; 
                        request.session.roles = rol.Tipo_Rol;
                        request.session.active = user.Alumno_activo;
                        request.session.rol_id = rol.IDRol;
                        request.session.user_id = rol.IDUsuario;
                        return request.session.save(err => {
                            response.redirect('/');
                        });
                    }).catch((error) => {console.log(error);});

                    
                } else {
                    request.session.error = 'La matrícula y/o contraseña son incorrectos.';
                    return response.redirect('/user/login')
                }
            })
            .catch((error) => {
                console.log(error);
            });
        }
        else {
            request.session.error = 'La matrícula y/o contraseña son incorrectos.'
            response.redirect('/user/login');
        }
    }).catch((error) => {
        request.session.error = 'Error Técnico: La base de datos no está conectada.'
        response.redirect('/user/login');
    })
}

exports.get_home = (request, response, next) => {
    Usuario.fetch(request.params.correo)
    .then(([users, fieldData]) => {
            response.render('home', {
                usuariosDB: users,
                correo: request.session.correo || '',
                permisos: request.session.permisos || [],
                rol: request.session.roles || '',
                nombre: request.session.nombre || '',
            });
        }
    )
    .catch(error => {
        console.log(error)

    })
}

exports.get_logout = (request, response, next) => {
    request.session.destroy(() => {
        response.redirect('/user/login');
    });

}

exports.get_signup = (request, response, next) => {
    const error = request.session.error || '';
    request.session.error = '';
    response.render('login', {
        correo: request.session.correo || '',
        registrar: true,
        error: error,
        rol: request.session.roles,
        nombre: request.session.nombre,
        csrfToken: request.csrfToken(),
        permisos: request.session.permisos || [],
    })
}

exports.post_signup = (request, response, next) => {
    const nuevo_usuario = new Usuario(request.body.correo, request.body.nombre, request.body.matricula, request.body.beca, request.body.ref, request.body.password);

    const confirmar = request.body.confirmpassword;
    if (confirmar !== request.body.password) {
        request.session.error = 'No has confirmado tu contraseña correctamente. Intenta de nuevo.';
        return response.redirect('/user/register');
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(request.body.password)) {
        request.session.error = 'Tu contraseña debe contener al menos 8 caracteres, un número y una mayúscula.';
        return response.redirect('/user/register');
    }

    nuevo_usuario.save()
        .then(([rows, fieldData]) => {
            response.redirect('/user/login');
        })
        .catch((error) => {
            console.log(error);
            request.session.error = 'Correo inválido.';
            response.redirect('/user/register');
        });
};

exports.get_forgot = async (request, response, next) => {

    Usuario.fetchAll()
    .then(([users, fieldData]) => {
        response.render('restablecer_contrasena', {
            usuariosDB: users,
            csrfToken: request.csrfToken(),
            sent: request.session.sent,
            feedback: request.session.feedback,
            errorValue: request.session.errorValue,            
        });
    })
    .catch((error) => {
        console.log(error);
    })
}


exports.post_forgot = (request, response, next) => {
    const correo = request.body.correo;
    request.session.correo = correo;
    request.session.feedback = '';
    request.session.errorValue = false;
    request.session.sent = false;

    // console.log('Start Error:', request.session.errorValue);
    // console.log('Start Sent:', request.session.sent);
    Usuario.fetchOneMail(correo).then(([users, fieldData]) => {
        if (users.length === 1) {
            const generateResetToken = () => {
                return require('crypto').randomBytes(32).toString('hex');
                
            }
            const resetToken = generateResetToken();
            const email = correo;
            const token = resetToken;
            const resetURL = `http://localhost:2050/user/change_password/${email}/${token}`;
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'testing20242304@gmail.com',
                    pass: 'mwks ltuh hxmm fwcc',
                },
            });
            const mailOptions = {
                from: 'testing20242304@gmail.com',
                to: correo,
                subject: 'Password Reset',
                text: `Has solicitado un cambio de contraseña. Haz clic en el siguiente link para restablecer tu contraseña.
                
                ${resetURL}`,
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log(error);

                } else {
                    console.log('Email sent: ' + info.response);
                }
            });

            request.session.token = resetToken;
            request.session.sent = true;
            request.session.feedback = 'Se ha enviado un correo a la dirección que ingresaste.';
            // console.log('Sent End:', request.session.sent, request.session.feedback);
            response.redirect('/user/forgot_password');
            
        } else {
            request.session.errorValue = true;
            request.session.feedback = 'No se ha encontrado este usuario en nuestro registro.';
            // console.log('Error End:', request.session.errorValue, request.session.feedback);
            response.redirect('/user/forgot_password');
        }
    }).catch((error) => {
        console.log('Error', error);
    });
}

exports.get_cambiar = (request, response, next) => {
    let passwordReset = false;
    request.session.passwordReset = passwordReset;
    response.render('cambiar_contrasena', {
        resetToken: request.params.resetToken,
        correo: request.params.correo,
        passwordReset: request.session.passwordReset,
        feedbackCC: request.session.feedbackCC,
        errorConfirm: request.session.errorValueConfirm,
        errorRegex: request.session.errorValueRegex,
        csrfToken: request.csrfToken(),
    })
    console.log('Token:', request.params.resetToken);
}

exports.post_cambiar = (request, response, next) => {
    const correo = request.body.correo;
    const new_password = request.body.new_password;
    const resetToken = request.body.resetToken;
    request.session.errorValueConfirm = false;
    request.session.passwordReset = false;
    // console.log('new password:', new_password);
    // console.log('session email:', correo);
    const confirmar = request.body.confirmpassword;
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

    console.log('Token:' , resetToken);

    if (confirmar !== request.body.new_password) {
        request.session.feedbackCC = 'No has confirmado tu contraseña correctamente. Intenta de nuevo.';
        request.session.errorValueConfirm = true;
        return response.redirect(`/user/change_password/${correo}/${resetToken}`);
    } else if (!passwordRegex.test(request.body.new_password)) {
        request.session.feedbackCC = 'Tu contraseña debe contener al menos 8 caracteres, un número y una mayúscula.';
        request.session.errorValueRegex = true;
        console.log(new_password);
        return response.redirect(`/user/change_password/${correo}/${resetToken}`);

    } else {
        
        Usuario.cambiar(new_password, correo).then(()=> {
            request.session.passwordReset = true;
            request.session.feedbackCC = 'Has cambiado tu contraseña exitosamente.';
            response.redirect(`/user/change_password/${correo}/${resetToken}`);
            
        }).catch((error)=>{console.log(error)})
    }
}

