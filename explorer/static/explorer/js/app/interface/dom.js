/**
 * @dom
 * DOM related functions.
 */

function make_div(id=null, c=null, html=null, parent=null) {
    let div = document.createElement('div');
    if (id !== null) { div.setAttribute('id', id); }
    if (c !== null) { div.setAttribute('class', c); }
    if (html !== null) { div.innerHTML = html; }
    if (parent !== null) { parent.appendChild(div); }
    return div;
}

function make_input(id=null, c=null, placeholder=null, spellcheck=false) {
    let input = make_div(id=id, c=c)
    input.setAttribute('contenteditable', 'true');
    if (placeholder !== null) { input.setAttribute('placeholder', placeholder); }
    if (spellcheck) { input.setAttribute('spellcheck', 'true'); }
    else { input.setAttribute('spellcheck', 'false'); }
    return input
}