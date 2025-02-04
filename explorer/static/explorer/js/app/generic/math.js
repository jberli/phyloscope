/**
 * @math
 * Math related functions.
 */

/**
 * Round a number to the given precision level.
 * @param  {float} value   Float to round.
 * @param  {int} precision Precision.
 * @return {numeric}       Rounded number.
 */
function round(value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}

export { round }