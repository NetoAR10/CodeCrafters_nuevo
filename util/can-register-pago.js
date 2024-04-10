module.exports = (request, response, next) => {

    let canRegisterPago = false;
    for(let privilegio of request.session.permisos) {
        if(privilegio.actividades == 'registrar pago') {
            canRegisterPago = true;
        }
    }

    if(canRegisterPago) {
        next();

    } else {
        return response.redirect('user/login');
    }
}