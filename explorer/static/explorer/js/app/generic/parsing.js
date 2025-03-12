/**
 * @parsing
 * Text parsing related functions.
 */

import { makeDiv } from "./dom.js";
import { round } from "./math.js";

/**
 * Compare two strings.
 * @param  {string} str1 - String 1.
 * @param  {string} str2 - String 2.
 * @param  {boolean} lowercase - Whether to lowercase both strings.
 * @param  {Array} replace - Array of arrays as ['character to replace', 'character to swap for'].
 * @return {boolean} - Whether strings are equivalent.
 */
function compare(str1, str2, lowercase=false, replace=[]) {
    let a = str1;
    let b = str2;
    if (lowercase) {
        a = a.toLowerCase();
        b = b.toLowerCase();
    }
    for (let i = 0; i < replace.length; i++) {
        let c1 = replace[0]
        let c2 = replace[1]
        a.replace(c1, c2);
        b.replace(c1, c2);
    }
    if (a === b) { return true }
    else { return false }
}

/**
 * Remove trailing space.
 * @param  {string} str - Input string.
 * @return {string} - String without trailing spaces.
 */
function removeTrailing(str) {
    return str.replace(/\s+$/, '');
}

/**
 * Uppercase the first letter of a given string.
 * @param  {String} str - The string to uppercase.
 * @return {String} - The uppercased string.
 */
function uppercaseFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
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
 * Calculate the width that would take a string of a given style in the DOM.
 * @param {string} text - String to test.
 * @param {ElementCSSInlineStyle} style - Style of the element.
 * @param {float} fontsize - Size of the font in rem.
 * @returns {float} width - Width in px of the text.
 */
function calculateTextWidth(text, style, fontsize) {
    let dummy = document.createElement('div');
    dummy.style.fontFamily = style.fontFamily;
    dummy.style.fontSize = fontsize + 'rem';
    dummy.style.fontWeight = style.fontWeight;
    dummy.style.fontStyle = style.fontStyle;
    dummy.style.height = 'auto';
    dummy.style.width = 'auto';
    dummy.style.position = 'absolute';
    dummy.style.whiteSpace = 'nowrap';
    dummy.innerHTML = text;
    document.body.appendChild(dummy);
    let width = dummy.clientWidth;
    dummy.remove();
    return width;
}

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
 * Properly format a percentage to avoid having too many numbers.
 * @param  {Float} c - Input percentage.
 * @return {String} - Formated percentage.
 */
function formatPercentage(float) {
    let perc = '';
    if (round(float, 1) < 10) {
        if (round(float, 1) < 0.1) {
            if (round(float, 2) < 0.01) {
                perc += round(float, 3).toFixed(3) + '%';
            } else {
                perc += round(float, 2).toFixed(2) + '%';
            }
        } else {
            perc += round(float, 1).toFixed(1) + '%';
        }
    } else {
        perc += Math.round(float) + '%';
    }
    return perc;
}

export {
    compare, removeTrailing, uppercaseFirstLetter, boldSubstring,
    calculateTextWidth, calculateWidthFromClass, formatPercentage
}