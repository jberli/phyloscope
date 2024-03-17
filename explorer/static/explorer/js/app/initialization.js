/**
 * @initialization
 * Defines the initialization of the application.
 */

$(document).ready(function() {
    let container = make_div(id='container')
    let mapdiv = make_div(id='map')
    container.appendChild(mapdiv)
    document.body.appendChild(container);

    initialize_map(mapdiv);

    let lookup = make_div(id='lookup')
    container.appendChild(lookup);

    ajax({ bonjour: '152' }, 'lookup/', 'POST', function(e) {
        console.log(e)
    })   
})