/**
 * @dom
 * DOM related functions.
 */

function make_div(id=null, c=null, html=null) {
    let div = document.createElement('div');
    if (id !== null) { div.setAttribute('id', id) }
    if (c !== null) { div.setAttribute('class', c) }
    if (html !== null) { div.innerHTML = html }
    return div
}