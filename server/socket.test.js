

const io = require('socket.io-client');

let socket;
let lastMessageReceived = "";

/**
 * Setup WS & HTTP servers
 */
beforeAll((done) => {
  socket = io.connect(`http://localhost:1337`, {
    'reconnection delay': 0,
    'reopen delay': 0,
    'force new connection': true,
    transports: ['websocket'],
  });
  socket.on('connect', () => {
    done();
  });

  socket.on('general-errors', (errorMessage) => {
    lastMessageReceived = errorMessage;
  });

});

/**
 *  Cleanup WS & HTTP servers
 */
afterAll((done) => {
  socket.disconnect();
  done();

});



describe('Test that all of the submit answer functions fail gracefully if not connected', () => {
    test("Check we can't send a message as we've not connected yet.", async (done) => {
      //We've not joined a game, so this should faile
      socket.emit('chat-message', "");
      socket.once('general-errors', (errorMessage) => {
        expect(errorMessage).toBe('Game not found!');
        done();
      });
    });

    test("Check we can't submit an answer as we've not connected yet.", async (done) => {

      //We've not joined a game, so this should failed
      socket.emit('submit-answer', {answerId: 438937, answerText: "Testing"});
      socket.once('general-errors', (errorMessage) => {
        expect(errorMessage).toBe('Game not found!');
        done();
      });
    });


    test("Check that we can't start a game before joining", async (done) => {

      //We've not joined a game, so this should faile
      socket.emit('start-game', true);
      socket.once('general-errors', (errorMessage) => {
        expect(errorMessage).toBe('We could not find the game that should be starting');
        done();
      });
    });

    test("Check that we can't mark an answer before joining a game", async (done) => {

      //We've not joined a game, so this should faile
      socket.emit('mark-answer', { answerCorrect: true, questionId: 3647, playerUUID: 'kdjhfd-343uy4-3y43yu3' });
      socket.once('general-errors', (errorMessage) => {
        expect(errorMessage).toBe('Cannot submit answer for marking! Game not found!');
        done();
      });
    });

    test("Check that we can't go the next question before joining a game", async (done) => {

      //We've not joined a game, so this should faile
      socket.emit('load-next-question', true);
      socket.once('general-errors', (errorMessage) => {
        expect(errorMessage).toBe('Cannot load next question! Game not found!');
        done();
      });
    });

});