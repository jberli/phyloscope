/**
 * @ajax
 * Ajax related functions.
 */

/**
 * Create and send an xhr request.
 */
function xhr(type, url, data, options) {
    options = options || {};
    var request = new XMLHttpRequest();
    request.open(type, url, true);
    if (type === "POST") { request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded'); }
    request.onreadystatechange = function () {
        if (this.readyState === 4) {
            if (this.status >= 200 && this.status < 400) {
                options.success && options.success(parse(this.responseText));
            } else {
                options.error && options.error(this.status);
            }
        }
    };
    request.send(data);
}


/**
 * Create and send an ajax request.
 */
function ajax(method, url, data, callback) {
    return xhr(method, url, data, { success:callback });
}

/**
 * Create and send an ajax GET request.
 */
function ajaxGet(url, callback) {
    return xhr("GET", url, undefined, { success:callback });
}

/**
 * Create and send an ajax POST request.
 */
function ajaxPost(url, data, callback) {
    return xhr("POST", url, data, { success:callback });
}

function parse(text) {
    try {
        return JSON.parse(text);
    } catch(e){
        return text;
    }
}

function loadImage(image) {
    return new Promise(resolve=>{ image.onload = resolve })
}

export { ajax, ajaxGet, ajaxPost, loadImage }