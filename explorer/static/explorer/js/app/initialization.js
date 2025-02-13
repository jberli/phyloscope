/**
 * @initialization
 * Initialize the application.
 */

import Application from "./interface/application.js";

// Initialize the application
// Wait for the DOM the finish loading
window.addEventListener('DOMContentLoaded', () => {
    new Application();
});