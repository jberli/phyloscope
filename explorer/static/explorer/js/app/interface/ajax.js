/**
 * @ajax
 * Ajax related functions.
 */

function ajax(data, url, method, callback) {
    fetch(url, {
        method: method,
        body: data,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }).then((response) => {
        return response.json()
    }).then((r) => {
        callback(r)
    }).catch((e) => {
        callback(e)
    })
}