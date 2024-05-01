module.exports = (request, response, next) => {

    let canModifyPago = false;
    for(let privilegio of request.session.permisos) {
        if(privilegio.Actividades == 'modificar pago') {
            canModifyPago = true;
        }
    }

    if(canModifyPago) {
        next();

    } else {
        return response.redirect('user/login');
    }
}