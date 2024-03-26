/**
 * @dom
 * DOM related functions.
 */

/**
 * Create a div with custom properties. Append the div to the parent if provided.
 * @param  {String} id         ID of the element.
 * @param  {String} c          Class of the element.
 * @param  {String} html       Content of the element.
 * @param  {DOMElement} parent Parent element to append the div to.
 * @return {DOMElement}        Created element.
 */
function makeDiv(id=null, c=null, html=null, parent=null) {
    let div = document.createElement('div');
    if (id !== null) { div.setAttribute('id', id); }
    if (c !== null) { div.setAttribute('class', c); }
    if (html !== null) { div.innerHTML = html; }
    if (parent !== null) { parent.appendChild(div); }
    return div;
}

/**
 * Create an input div with custom properties.
 * @param  {String} id          ID of the element.
 * @param  {String} c           Class of the element.
 * @param  {String} placeholder String placeholder.
 * @param  {boolean} spellcheck If spellcheck is enabled. Default to false.
 * @return {DOMElement}         Created element.
 */
function makeInput(id=null, c=null, placeholder=null, spellcheck=false) {
    let input = makeDiv(id=id, c=c)
    input.setAttribute('contenteditable', 'true');
    if (placeholder !== null) { input.setAttribute('placeholder', placeholder); }
    if (spellcheck) { input.setAttribute('spellcheck', 'true'); }
    else { input.setAttribute('spellcheck', 'false'); }
    return input
}

/**
 * Create an image div with custom properties.
 * @param  {String} url    URL of the image.
 * @param  {int} height    Height in px.
 * @param  {int} width     Width in px.
 * @param  {String} id     ID of the element.
 * @param  {String} c      Class of the element.
 * @param  {String} alt    Alternative if image is not loaded.
 * @return {DOMElement}    Created element.
 */
function makeImage(url, height=null, width=null, id=null, c=null, alt='') {
    let image = document.createElement('img');
    if (id !== null) { image.setAttribute('id', id); }
    if (c !== null) { image.setAttribute('class', c); }
    if (url !== null) { image.setAttribute('src', url); }
    if (height !== null) { image.setAttribute('height', height); }
    if (width !== null) { image.setAttribute('width', width); }
    if (alt !== null) { image.setAttribute('alt', alt); }
    return image
}

/**
 * Remove all the children from a given DOM Element.
 * @param  {DOMElement} element The DOM Element to remove all children from.
 */
function removeChildren(element) {
    while (element.firstChild) {
        element.firstChild.remove();
    }
}

/**
 * Return the provided string with html <strong> tag around the substring to bold.
 * @param  {String} str    The string to split.
 * @param  {String} substr The substring to split the string.
 * @return {String}        The string with html <strong> tag around the substring.
 */
function boldSubstring(str, substr) {
    str = str.toLowerCase();
    substr = substr.toLowerCase();
    let split = str.split(substr);
    let result = ''
    for (let i = 0; i < split.length; ++i) {
        let value = split[i]
        if (i == 0 && value.length > 0) { value = uppercaseFirstLetter(value) }
        result += value;
        if (i !== split.length - 1) {
            if (result.length == 0) { result += '<strong>' + uppercaseFirstLetter(substr) + '</strong>' }
            else { result += '<strong>' + substr + '</strong>' }
        }
    }
    return result;
}

/**
 * Uppercase the first letter of a given string.
 * @param  {String} str The string to uppercase.
 * @return {String}     The uppercased string.
 */
function uppercaseFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Append each child of the list to the parent.
 * @param  {DOMElement} parent Element to append the element to.
 * @param  {Array} children    Children to append to the parent.
 */
function appendMultiple(parent, children) {
    for (i = 0; i < children.length; ++i) {
        parent.appendChild(children[i]);
    };
};


/**
 * Check if the given element has the class.
 * @param  {DOMElement} e Element to check.
 * @param  {String} c     Class to check.
 */
function hasClass(e, c) {
    if (e.classList)
        return e.classList.contains(c)
    else
        return !!e.c.match(new RegExp('(\\s|^)' + c + '(\\s|$)'))
};

/**
 * Remove the given class from a given element.
 * @param  {DOMElement} e Element to remove the class from.
 * @param  {String} c     Class to remove.
 */
function removeClass(e, c) {
    if (e.classList)
        e.classList.remove(c)
    else if (hasClass(e, c)) {
        var reg = new RegExp('(\\s|^)' + c + '(\\s|$)')
        e.c = el.c.replace(reg, ' ')
    }
};

/**
 * Add the given class to a given element.
 * @param  {DOMElement} e Element to add the class to.
 * @param  {String} c     Class to add.
 */
function addClass(e, c) {
    if (e.classList)
        e.classList.add(c)
    else if (!hasClass(e, c)) e.c += " " + c
};
