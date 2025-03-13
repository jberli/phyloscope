/**
 * @map
 * Function related to map handling.
 */

/**
 * Animate the opacity of an OpenLayers Layer.
 * @param  {Layer} layer - OpenLayers Layer object to animate.
 * @param  {int} duration - Duration of the animation (ms).
 * @param  {int} fps - Frame per second of the animation.
 * @param  {float} value - Result opacity value.
 * @param  {function} callback - Callback function.
 */
function animateOpacity(layer, duration, fps, value, callback) {
    callback = callback || function () {};
    
    let opacity = layer.getOpacity();
    const step = (duration/1000)*fps;
    const delay = duration / step;
    const increment = (value - opacity) / step;

    let pass = 0;
    function animate(c) {
        setTimeout(() => {
            opacity += increment;
            if (opacity < 0) { opacity = 0 }
            layer.setOpacity(opacity);
            pass += 1;
            if (pass < step) {
                animate(c);
            } else {
                layer.setOpacity(value);
                c();
            }
        }, delay)
    }
    animate(() => { callback(); });
}

export { animateOpacity }