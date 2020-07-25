

const io             = require('socket.io-client');
var config           = require('./_config');
var mongoose         = require('mongoose');
const GameController = require('./controllers/Game.js');
const GameSchema     = require('./schema/Game.js');

//Connect to the database
mongoose.connect(config.mongoDatabaseString, {useNewUrlParser: true, useUnifiedTopology: true});
var db = mongoose.connection;

GameSchema.loadClass(GameController);
let Game = mongoose.model('Game', GameSchema);
let socket;
let game;
let player;
let lastErrorMessage = "";
let lastSuccessMessage = "";
/**
 * Setup WS & HTTP servers
 */
beforeAll( async (done) => {
  socket = io.connect(`http://localhost:1337`, {
    'reconnection delay': 0,
    'reopen delay': 0,
    'force new connection': true,
    transports: ['websocket'],
  });
  socket.on('connect', () => {
    done();
  });



  game =  await Game.findOne({game_started: 0, game_completed: 0}).exec().catch((err) => {
    console.log(err)
  });
  if(typeof game.game_id == 'undefined') {
    throw 'No game to test with found';
  }

  socket.on('general-errors', (errorMessage) => {
    lastErrorMessage = errorMessage;
  });
  socket.on('success', (successMessage) => {
    lastSuccessMessage = successMessage;
  });
  socket.on('player', (sentPlayer) => {
    player = sentPlayer;
  });

});

/**
 *  Cleanup WS & HTTP servers
 */
afterAll(async (done) => {
  socket.disconnect();
  let Game = await mongoose.model('Game', GameSchema);
  game     = await Game.findOne({game_id: game.game_id}).exec().catch((err) => {
    console.log(err)
  });

  game.game_started      = 0;
  game.game_completed    = 0;
  game.have_admin_player = 0;
  game.players           = [];
  game.admin_socket_id   = "";
  await game.save();
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

describe('Test the game joining functions', () => {

  test("Attempt to join a game with no game ID", async (done) => {
    //We've not joined a game, so this should faile
    await socket.emit('join-game', {});
    socket.once('general-errors', (errorMessage) => {
      expect(errorMessage).toBe("Cannot join game! No Game ID found!\nCannot join game! No table found!\n");
      done();
    });
  });

  test("Attempt to join a game with no table", async (done) => {
    //We've not joined a game, so this should faile
    await socket.emit('join-game', {gameId: game.game_id});
    socket.once('general-errors', (errorMessage) => {
      expect(errorMessage).toBe("Cannot join game! No table found!\n");
      done();
    });
  });

  test("Attempt to join a game with no player details", async (done) => {
    //We've not joined a game, so this should faile
    await socket.emit('join-game', {gameId: game.game_id, tableId: 'table_1'});
    socket.once('login-errors', (errorMessage) => {
      expect(errorMessage).toBe("You must enter a name!\nYou must select an avatar!\n");
      done();
    });
  });

  test("Attempt to join a gamer with no player name", async (done) => {
    //We've not joined a game, so this should faile
    await socket.emit('join-game', {gameId: game.game_id, tableId: 'table_1', playerAvatar: 11, password: 'test99' });
    socket.once('login-errors', (errorMessage) => {
      expect(errorMessage).toBe("You must enter a name!\n");
      done();
    });
  });

  test("Attempt to join a gamer with a player name over 30 characters long", async (done) => {
    //We've not joined a game, so this should faile
    await socket.emit('join-game', {gameId: game.game_id, tableId: 'table_1', playerName: 'dfjlksdjhflsdkjhfsdlkjadhgfkjashdgfdkjshagfkjashgdfkdjshagfkjdshagfkjashdgfkjhsagfkjdhg', playerAvatar: 11, password: 'test99' });
    socket.once('login-errors', (errorMessage) => {
      expect(errorMessage).toBe("Your name cannot be longer than 30 characters!\n");
      done();
    });
  });

  test("Attempt to join a gamer with no player avatar", async (done) => {
    //We've not joined a game, so this should faile
    await socket.emit('join-game', {gameId: game.game_id, playerName: 'Test', tableId: 'table_1', password: 'test99' });
    socket.once('login-errors', (errorMessage) => {
      expect(errorMessage).toBe("You must select an avatar!\n");
      done();
    });
  });

  test("Attempt to join a gamer with a player avatar that doesn't exist", async (done) => {
    //We've not joined a game, so this should faile
    await socket.emit('join-game', {gameId: game.game_id, tableId: 'table_1', playerName: 'Test', playerAvatar: 'fish', password: 'test99' });
    socket.once('login-errors', (errorMessage) => {
      expect(errorMessage).toBe("Avatar not found!\n");
      done();
    });
  });
});

describe('Joining a game then check we can\'t run any of the game joining functions', () => {

  test("Join the game as an admin player", async (done) => {
    //We've not joined a game, so this should faile
    await socket.emit('join-game', {gameId: game.game_id, tableId: 'table_1', playerName: 'Test', playerAvatar: 11, password: 'test99' });
    socket.once('success', (successMessage) => {
      expect(successMessage).toBe('You haver successfully joined the \''+game.name+'\' game!');
      done();
    });
    socket.once('login-errors', (errorMessage) => {
      expect(errorMessage).toBe('You haver successfully joined the \''+game.name+'\' game!');
      done();
    });
  });

  test("Check we can't submit an answer before the game has started.", async (done) => {
    //We've not joined a game, so this should failed
    socket.emit('submit-answer', {answerId: 438937, answerText: "Testing"});
    socket.once('general-errors', (errorMessage) => {
      expect(errorMessage).toBe("Game has not started yet!.\nWe're not marking that question anymore. :-(\nYou must enter an answer for marking!\n");
      done();
    });
  });

  test("Check that we can't mark an answer before the game has started.", async (done) => {
    //We've not joined a game, so this should faile
    socket.emit('mark-answer', { answerCorrect: true, questionId: 3647, playerUUID: 'kdjhfd-343uy4-3y43yu3' });
    socket.once('general-errors', (errorMessage) => {
      expect(errorMessage).toBe("Game has not started yet!.\nCould not find that question.\nCould not find that player.\n");
      done();
    });
  });

  test("Check that we can't go the next question before the game has started.", async (done) => {
    //We've not joined a game, so this should faile
    socket.emit('load-next-question', true);
    socket.once('general-errors', (errorMessage) => {
      expect(errorMessage).toBe("Game has not started yet!.\n");
      done();
    });
  });


});