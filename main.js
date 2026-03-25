/* ================================================================
   main.js
   Entry point — bootstraps the game once the DOM is ready.

   Script load order in index.html must be:
     1. constants.js
     2. sprites.js
     3. audio.js
     4. camera.js
     5. input.js
     6. entities.js
     7. collisions.js
     8. renderer.js
     9. game.js
    10. menu.js
    11. main.js    ← this file
================================================================= */

window.addEventListener('DOMContentLoaded', () => {
    new MenuSystem();
});