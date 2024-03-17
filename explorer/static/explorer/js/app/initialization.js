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

    lookup.addEventListener("focusin", focusin);

    function focusin(event) {
        lookup.addEventListener("input", input);
        lookup.addEventListener("focusout", focusout);
    }

    function focusout(event) {
        lookup.removeEventListener("input", input);
    }

    function input(event) {
        let value = event.target.innerHTML.replace('<br>', '').trim();
        if (value.length > 2) {
            let data = { str: value };
            ajax(data, 'lookup/', 'POST', function(r) {
                for (let i = 0; i < r.values.length; ++i) {
                    let entry = r.values[i];
                    let name = entry.vernacular.charAt(0).toUpperCase() + entry.vernacular.slice(1);
                    console.log('(' + entry.type.toUpperCase() + ') ' + name + ' - ' + entry.scientific);
                }
            });
        }
    }

    lookupcontainer.appendChild(lookup);
    header.appendChild(lookupcontainer);
})