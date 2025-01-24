/**
 * @dom
 * DOM related functions.
 */

import { ajaxGet } from "./ajax.js";

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
 * Wait for a given number of milliseconds before executing a function.
 * @param  {int} duration      Duration to wait.
 * @param  {function} callback Function to execute.
 */
function wait(duration, callback) { setTimeout(callback, duration); };

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
 * Remove the given class from a list of given elements.
 * @param  {Array} e   Elements to remove the class from.
 * @param  {String} c  Class to remove.
 */
function removeClassList(e, c) {
    for (let i = 0; i < e.length; ++i) { removeClass(e[i], c) }
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

/**
 * Add the given class to a list of given elements.
 * @param  {Array} e   Elements to add the class to.
 * @param  {String} c  Class to add.
 */
function addClassList(e, c) {
    for (let i = 0; i < e.length; ++i) { addClass(e[i], c) }
};

/**
 * Create a dummy DOM element from a className and return the width property.
 * @param  {String} c Class to add.
 * @return {int}      Width of the element.
 */
function calculateWidthFromClass(c) {
    let node = makeDiv(null, c);
    document.body.append(node);
    let width = node.offsetWidth;
    node.remove();
    return width;
}

/**
 * Adds an svg as the inner HTML of the target div.
 * @param  {DOMElement} target Target to place the svg.
 * @param  {String}            SVG file url.
 */
function addSVG(target, url) {
    ajaxGet(url, (svg) => { target.innerHTML = svg; });
}

function calculateTextWidth(text, style, fontsize) {
    let dummy = document.createElement('div');
    dummy.style.fontFamily = style.fontFamily;
    dummy.style.fontSize = fontsize;
    dummy.style.fontWeight = style.fontWeight;
    dummy.style.fontStyle = style.fontStyle;
    dummy.style.height = 'auto';
    dummy.style.width = 'auto';
    dummy.style.position = 'absolute';
    dummy.style.whiteSpace = 'nowrap';
    dummy.innerHTML = text;
    document.body.appendChild(dummy);
    let width = Math.ceil(dummy.clientWidth);
    dummy.remove();
    return width;
}

// function loadImage(url) {
//     let imageDiv = makeDiv(null, c='taxonomy-image-container');
//     let imageMask = makeDiv(null, 'photo-mask loading');
//     let loader = makeDiv(null, 'photo-loader');
//     let image = makeImage(url, null, null, null, 'photo');
//     loadingImage(image).then(() => { removeClass(imageMask, 'loading') });
//     imageMask.appendChild(loader);
//     imageDiv.append(imageMask, image);
//     return imageDiv;
// }

export {
    addClass, removeClass, addClassList, removeClassList,
    makeDiv, makeInput, makeImage, wait, addSVG
}