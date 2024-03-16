/**
 * @initialization
 * Defines the initialization of the application.
 */

window.addEventListener('load', function () {
    let container = document.createElement('div');
    container.setAttribute('id', 'container');
    let mapdiv = document.createElement('div');
    mapdiv.setAttribute('id', 'map');

    container.appendChild(mapdiv)
    document.body.appendChild(container);

    initialize_map(mapdiv);
})