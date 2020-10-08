

# Required Packages

This site was developed on version v10.15.3 of node.

When in development, you'll need to install the following items:

  1) [Nodemon](https://github.com/remy/nodemon) - Used to watch for file changes in the background and re-run the server. Install this globally.
  2) [Concurrently](https://github.com/kimmobrunfeldt/concurrently) - Allows Node to run two commands at once and so watch both the server and front end for changes that need re-compiling. Install this globally.


# Running the server

## Development mode

Use the command `npm run start` to run the server in test mode. This will also watch for any JS/CSS changes in the backround and automatically compile them.

## Live mode

Use the command `npm run server-only` to run the express js / socket io server only. This would normally be used in development where you don't need to compile the SASS/JS as it's precompiled.

## Compiling JS / Sass

Use the command `npm run build` to compile the JS and Sass, this would normally be used on the live server to compile the updated assets.

## Running Integration tests.

Navigate to the _server_ directory and run the command `npm run test-server`. This will run a series of integration tests to ensure the test system is working as expected. A game must have been created for the tests to run successfully.

# Change Log

### 1.0.3 - Implemented integration tests

  * Implemented integration tests.
  * Resolved minor issues raised by integration tests.

### 1.0.1 Fixes

  * Fixed issue stopping the success messages from being hidden.
  * Fixed issue stopping users reconnecting to a game after quitting.