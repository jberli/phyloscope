/**
 * @initialization
 * Defines the initialization of the application.
 */

$(document).ready(function() {
    let header = make_div(id='header');
    document.body.appendChild(header);

    let container = make_div(id='container')
    let mapdiv = make_div(id='map')
    container.appendChild(mapdiv)
    document.body.appendChild(container);

    initialize_map(mapdiv);

    let lookupcontainer = make_div(id='lookup-container');
    let lookup = make_input(id='lookup');
    lookupcontainer.appendChild(lookup);
    header.appendChild(lookupcontainer);

    ajax({ bonjour: '152' }, 'lookup/', 'POST', function(e) {
        console.log(e)
    })   
})