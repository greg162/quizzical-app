

const io             = require('socket.io-client');
var config           = require('./_config');
var mongoose         = require('mongoose');
const GameController = require('./controllers/Game.js');
const GameSchema     = require('./schema/Game.js');
var _                = require('lodash');

//Connect to the database
mongoose.connect(config.mongoDatabaseString, {useNewUrlParser: true, useUnifiedTopology: true});
var db = mongoose.connection;

GameSchema.loadClass(GameController);
let Game = mongoose.model('Game', GameSchema);
let game;
let gamePlayer;
let adminPlayer;
let lastErrorMessage   = "";
let lastSuccessMessage = "";
let questionIds        = [];
let questions          = [];
let currentQuestion;
let answerForMarking;
let gotPoint;
let playerOneScore = 0;
let playerGameCompleted = false;
let adminGameCompleted  = false;


/**
 * Setup WS & HTTP servers
 */
beforeAll( async (done) => {
  adminConnection = await io.connect(`http://localhost:1337`, {
    'reconnection delay': 0,
    'reopen delay': 0,
    'force new connection': true,
    transports: ['websocket'],
  });

  playerConnection = await io.connect(`http://localhost:1337`, {
    'reconnection delay': 0,
    'reopen delay': 0,
    'force new connection': true,
    transports: ['websocket'],
  });

  game =  await Game.findOne({game_id: 'IzzZhRSjhS'}).exec().catch((err) => {
    console.log(err)
  });

  if(typeof game.game_id == 'undefined') {
    throw 'No game to test with found';
  }

  if(game.questions.length !== 3) { //TODO: Make it so that any number of questions can be tested.
    throw 'The test game must have three questions';
  }

  game.questions.forEach(question => {
    questions[question.id] = question;
    questionIds.push(question.id);
  });

  //Reset the game (if required)
  game.game_started      = 0;
  game.game_completed    = 0;
  game.have_admin_player = 0;
  game.players           = [];
  game.answers           = [];
  game.admin_socket_id   = "";
  game.current_question  = {};
  game.current_question_key = "";
  await game.save();

  adminConnection.on('general-errors', (errorMessage) => {
    lastErrorMessage = errorMessage;
  });
  adminConnection.on('success', (successMessage) => {
    lastSuccessMessage = successMessage;
  });

  adminConnection.on('load-question', (question) => {
    currentQuestion = _.cloneDeep(question);
  });

  playerConnection.on('load-question', (question) => {
    currentQuestion = _.cloneDeep(question);
  });

  adminConnection.on('joined-game', (player) => {
    adminPlayer = player;
  });

  playerConnection.on('joined-game', (player) => {
    gamePlayer = player;
  });

  playerConnection.on('game-complete', (gameCompleted) => {
    playerGameCompleted = gameCompleted;
  });
  
  adminConnection.on('game-complete', (gameCompleted) => {
    adminGameCompleted = gameCompleted;
  });

  adminConnection.on('answer-for-marking', (answer) => {
    answerForMarking = answer;
  });

  playerConnection.on('updated-player-score', (playerScore, gotPoint, playerUUID) => {
    if(gamePlayer.uuid == playerUUID) {
      playerOneScore = playerScore;
    }
  });

  playerConnection.on('updated-player-score', (playerScore, pointReturner, playerUUID) => {
    if(gamePlayer.uuid == playerUUID) {
      gamePlayer.score        = parseInt(playerScore);
      gamePlayer.scoreUpdated = true;
    }
    gotPoint = pointReturner;
  });


  done();
});

/**
 *  Cleanup WS & HTTP servers
 */
afterAll(async (done) => {
  adminConnection.disconnect();
  let Game = await mongoose.model('Game', GameSchema);
  game     = await Game.findOne({game_id: game.game_id}).exec().catch((err) => {
    console.log(err)
  });

  //Reset the game after closing
  game.game_started      = 0;
  game.game_completed    = 0;
  game.have_admin_player = 0;
  game.players           = [];
  game.admin_socket_id   = "";
  //await game.save();
  done();


});



describe('Test that all of the submit answer functions fail gracefully if not connected', () => {

  test("Check we can't send a message as we've not connected yet.", async (done) => {
    //We've not joined a game, so this should faile
    adminConnection.emit('chat-message', "");
    adminConnection.once('general-errors', (errorMessage) => {
      expect(errorMessage).toBe('Game not found!');
      done();
    });
  });


  test("Check we can't submit an answer as we've not connected yet.", async (done) => {
    //We've not joined a game, so this should failed
    adminConnection.emit('submit-answer', {answerId: 438937, answerText: "Testing"});
    adminConnection.once('general-errors', (errorMessage) => {
      expect(errorMessage).toBe('Game not found!');
      done();
    });
  });


  test("Check that we can't start a game before joining", async (done) => {

    //We've not joined a game, so this should faile
    adminConnection.emit('start-game', true);
    adminConnection.once('general-errors', (errorMessage) => {
      expect(errorMessage).toBe("We could not find the game that should be starting\nYou are not an admin player.\n");
      done();
    });
  });


  test("Check that we can't mark an answer before joining a game", async (done) => {
    //We've not joined a game, so this should faile
    adminConnection.emit('mark-answer', { answerCorrect: true, questionId: 3647, playerUUID: 'kdjhfd-343uy4-3y43yu3' });
    adminConnection.once('general-errors', (errorMessage) => {
      expect(errorMessage).toBe('Cannot submit answer for marking! Game not found!');
      done();
    });
  });


  test("Check that we can't go the next question before joining a game", async (done) => {
    //We've not joined a game, so this should faile
    adminConnection.emit('load-next-question', true);
    adminConnection.once('general-errors', (errorMessage) => {
      expect(errorMessage).toBe('Cannot load next question! Game not found!');
      done();
    });
  });
});

describe('Test the game joining functions', () => {

  test("Attempt to join a game with no game ID", async (done) => {
    //We've not joined a game, so this should faile
    await adminConnection.emit('join-game', {});
    adminConnection.once('general-errors', (errorMessage) => {
      expect(errorMessage).toBe("Cannot join game! No Game ID found!\nCannot join game! No table found!\n");
      done();
    });
  });


  test("Attempt to join a game with no table", async (done) => {
    //We've not joined a game, so this should faile
    await adminConnection.emit('join-game', {gameId: game.game_id});
    adminConnection.once('general-errors', (errorMessage) => {
      expect(errorMessage).toBe("Cannot join game! No table found!\n");
      done();
    });
  });


  test("Attempt to join a game with no player details", async (done) => {
    //We've not joined a game, so this should faile
    await adminConnection.emit('join-game', {gameId: game.game_id, tableId: 'table_1'});
    adminConnection.once('login-errors', (errorMessage) => {
      expect(errorMessage).toBe("You must enter a name!\nYou must select an avatar!\n");
      done();
    });
  });


  test("Attempt to join a game with no player name", async (done) => {
    //We've not joined a game, so this should faile
    await adminConnection.emit('join-game', {gameId: game.game_id, tableId: 'table_1', playerAvatar: 11, password: 'test99' });
    adminConnection.once('login-errors', (errorMessage) => {
      expect(errorMessage).toBe("You must enter a name!\n");
      done();
    });

  });


  test("Attempt to join a game with a player name over 30 characters long", async (done) => {
    //We've not joined a game, so this should faile
    await adminConnection.emit('join-game', {gameId: game.game_id, tableId: 'table_1', playerName: 'dfjlksdjhflsdkjhfsdlkjadhgfkjashdgfdkjshagfkjashgdfkdjshagfkjdshagfkjashdgfkjhsagfkjdhg', playerAvatar: 11, password: 'test99' });
    adminConnection.once('login-errors', (errorMessage) => {
      expect(errorMessage).toBe("Your name cannot be longer than 30 characters!\n");
      done();
    });
  });


  test("Attempt to join a game with no player avatar", async (done) => {
    //We've not joined a game, so this should faile
    await adminConnection.emit('join-game', {gameId: game.game_id, playerName: 'Test', tableId: 'table_1', password: 'test99' });
    adminConnection.once('login-errors', (errorMessage) => {
      expect(errorMessage).toBe("You must select an avatar!\n");
      done();
    });
  });


  test("Attempt to join a game with a player avatar that doesn't exist", async (done) => {
    //We've not joined a game, so this should faile
    await adminConnection.emit('join-game', {gameId: game.game_id, tableId: 'table_1', playerName: 'Test', playerAvatar: 'fish', password: 'test99' });
    adminConnection.once('login-errors', (errorMessage) => {
      expect(errorMessage).toBe("Avatar not found!\n");
      done();
    });
  });


  test("Attempt to join a game with the incorrect password", async (done) => {
    //We've not joined a game, so this should faile
    await adminConnection.emit('join-game', {gameId: game.game_id, tableId: 'table_1', playerName: 'Test', playerAvatar: 11, password: 'test9999' });
    adminConnection.once('login-errors', (errorMessage) => {
      expect(errorMessage).toBe("The password you entered is not valid!\n");
      done();
    });
  });


});

describe('Joining a game then check we can\'t run any of the game play functions', () => {

  test("Join the game as an admin player", async (done) => {
    //We've not joined a game, so this should faile
    await adminConnection.emit('join-game', {gameId: game.game_id, tableId: 'table_1', playerName: 'User - Admin', playerAvatar: 11, password: 'test99' });
    adminConnection.once('success', (successMessage) => {
      expect(successMessage).toBe('You have successfully joined the \''+game.name+'\' game!');
      done();
    });

  });


  test("Join the game as a normal player", async (done) => {
    //We've not joined a game, so this should faile
    await playerConnection.emit('join-game', {gameId: game.game_id, tableId: 'table_1', playerName: 'User - Player', playerAvatar: 28, password: '' });
    playerConnection.once('success', (successMessage) => {
      expect(successMessage).toBe('You have successfully joined the \''+game.name+'\' game!');
      done();
    });

  });


  test("Check we can't submit an answer before the game has started.", async (done) => {
    //We've not joined a game, so this should failed
    adminConnection.emit('submit-answer', {answerId: 438937, answerText: "Testing"});
    adminConnection.once('general-errors', (errorMessage) => {
      expect(errorMessage).toBe("Game has not started yet!\nAdmin users cannot submit an answer.\nWe're not marking that question anymore. :-(\n");
      done();
    });
  });


  test("Check that we can't mark an answer before the game has started.", async (done) => {
    //We've not joined a game, so this should faile
    adminConnection.emit('mark-answer', { answerCorrect: true, questionId: 3647, playerUUID: 'kdjhfd-343uy4-3y43yu3' });
    adminConnection.once('general-errors', (errorMessage) => {
      expect(errorMessage).toBe("Game has not started yet!\nCould not find that question.\nCould not find that player.\n");
      done();
    });
  });


  test("Check that we can't go the next question before the game has started.", async (done) => {
    //We've not joined a game, so this should faile
    adminConnection.emit('load-next-question', true);
    adminConnection.once('general-errors', (errorMessage) => {
      expect(errorMessage).toBe("Game has not started yet!\n");
      done();
    });
  });

});


describe('Start a game then test we can\'t any join game functions.\n', () => {

  test("Start the game", async (done) => {
    //We've not joined a game, so this should failed
    adminConnection.emit('start-game', true);
    adminConnection.once('game-started', (gameStarted) => {
      expect(gameStarted).toBe(true);
      done();
    });
  });


  test("Attempt to join a game as an admin player (again)", async (done) => {
    //We've not joined a game, so this should faile
    await adminConnection.emit('join-game', {gameId: game.game_id, tableId: 'table_1', playerName: 'Test', playerAvatar: 11, password: 'test99' });

    adminConnection.once('general-errors', (errorMessage) => {
      expect(errorMessage).toBe("You are already in a game. Quit first before joining another.\n");
      done();
    });
  });


  test("Start the game (again)", async (done) => {
    //We've not joined a game, so this should failed
    await adminConnection.emit('start-game', true);
    adminConnection.once('general-errors', (generalErrors) => {
      expect(generalErrors).toBe("The game has already started.\n");
      done();
    });
  });

});


describe('Test the question submission functions are working as expected.\n', () => {

  test("Check the current question is the first in the database.", async (done) => {
      expect(currentQuestion.id).toBe(game.questions[0].id);
      done();
 
  });


  test("Attempt to answer a question (as an admin)", async (done) => {
    await adminConnection.emit('submit-answer', {answerId: currentQuestion.id, answerText: "Testing" });
    adminConnection.once('general-errors', (errorMessage) => {
      expect(errorMessage).toBe("Admin users cannot submit an answer.\n");
      done();
    });
  
  });


  test("Attempt to go to the next question (as a player)", async (done) => {
    await playerConnection.emit('load-next-question', true);
    playerConnection.once('general-errors', (errorMessage) => {
      expect(errorMessage).toBe("You are not an admin player.\n");
      done();
    });
  
  });


  test("Answer a question as  (as a player)", async (done) => {
    await playerConnection.emit('submit-answer', {answerId: currentQuestion.id, answerText: "Testing", playerUUID: gamePlayer.uuid });
    playerConnection.once('success', (success) => {
      expect(success).toBe("Answer successfully sent.");
      done();
    });
  });


  test("Check the admin received the correct answer", async (done) => {
    expect([answerForMarking.answerText,answerForMarking.answerId, answerForMarking.playerUUID]).toEqual(["Testing", currentQuestion.id, gamePlayer.uuid]);
    done();
  });


});

describe('Check the answer marking functions are working as expected.\n', () => {

  test("Send no question ID and check error message", async (done) => {
    adminConnection.emit('mark-answer', { answerCorrect: true, playerUUID: gamePlayer.uuid });
    adminConnection.once('general-errors', (errors) => {
      expect(errors).toBe("No question ID was sent.\n");
      done();
    });
  });


  test("Send no player ID and check error message", async (done) => {
    adminConnection.emit('mark-answer', { answerCorrect: true/*, playerUUID: gamePlayer.uuid*/, questionId: currentQuestion.id });
    adminConnection.once('general-errors', (errors) => {
      expect(errors).toBe("No player ID was sent.\n");
      done();
    });
  });


  test("Send no Answer and check error message", async (done) => {
    adminConnection.emit('mark-answer', { /*answerCorrect: true,*/ playerUUID: gamePlayer.uuid, questionId: currentQuestion.id });
    adminConnection.once('general-errors', (errors) => {
      expect(errors).toBe("Answer correct value not sent.\n");
      done();
    });
  });


  test("Send invalid question ID", async (done) => {
    adminConnection.emit('mark-answer', { answerCorrect: true, playerUUID: gamePlayer.uuid, questionId: '485974' });
    adminConnection.once('general-errors', (errors) => {
      expect(errors).toBe("Could not find that question.\n");
      done();
    });
  });


  test("Send invalid player ID", async (done) => {
    adminConnection.emit('mark-answer', { answerCorrect: true, playerUUID: 'hjhgjhgjhgjhg', questionId: currentQuestion.id });
    adminConnection.once('general-errors', (errors) => {
      expect(errors).toBe("Could not find that player.\n");
      done();
    });
  });


  test("Mark the answer as true.", async (done) => {
    adminConnection.emit('mark-answer', { answerCorrect: true, playerUUID: gamePlayer.uuid, questionId: currentQuestion.id });
    playerConnection.once('success', (success) => {
      expect(success).toBe(`You got '${currentQuestion.question}' correct.\n`);
      done();
    });
  });


  test("Check the score is correct", async (done) => {
    expect(playerOneScore).toBe(1);
    done();
  });


  test("Answer a question as the player again - After marking", async (done) => {
    await playerConnection.emit('submit-answer', {answerId: currentQuestion.id, answerText: "Testing", playerUUID: gamePlayer.uuid });
    playerConnection.once('general-errors', (errors) => {
      expect(errors).toBe("You've already answered that question!\n");
      done();
    });
  });
});

describe('Check the go to next question system.\n', () => {


  test("Attempt to go to the next question as a player - again", async (done) => {
    await playerConnection.emit('load-next-question', true);
    playerConnection.once('general-errors', (errorMessage) => {
      expect(errorMessage).toBe("You are not an admin player.\n");
      done();
    });
  });


  test("Load the next question", async (done) => {
    await adminConnection.emit('load-next-question', true);
    adminConnection.once('load-question', (errorMessage) => {
      expect(true).toBe(true);
      done();
    });
  });


  test("Check the current question is second in the database.", async (done) => {
    expect(currentQuestion.id).toBe(game.questions[1].id);
    done();
  });


  test("Attempt to submit the previous question again", async (done) => {
    await playerConnection.emit('submit-answer', {answerId: game.questions[0].id, answerText: "Testing", playerUUID: gamePlayer.uuid });
    playerConnection.once('general-errors', (errors) => {
      expect(errors).toBe("We're not marking that question anymore. :-(\n");
      done();
    });
  });


  test("Mark the previous answer as true.", async (done) => {
    adminConnection.emit('mark-answer', { answerCorrect: true, playerUUID: gamePlayer.uuid, questionId: game.questions[0].id });
    adminConnection.once('general-errors', (errors) => {
      expect(errors).toBe("You've already marked that question.\n");
      done();
    });
  });

});

describe('Answer question two, mark it as incorrect.\n', () => {

  test("Answer question two as (as a player)", async (done) => {
    await playerConnection.emit('submit-answer', {answerId: currentQuestion.id, answerText: "Testing", playerUUID: gamePlayer.uuid });
    playerConnection.once('success', (success) => {
      expect(success).toBe("Answer successfully sent.");
      done();
    });
  });


  test("Mark the answer as wrong", async (done) => {
    adminConnection.emit('mark-answer', { answerCorrect: false, playerUUID: gamePlayer.uuid, questionId: currentQuestion.id });
    playerConnection.once('general-errors', (errors) => {
      expect(errors).toBe(`You got '${currentQuestion.question}' wrong :*******(.\n`);
      done();
    });
  });


  test("Check the score is correct", async (done) => {
    expect(playerOneScore).toBe(1);
    done();
  });

});

describe('Complete Question three normally, check that quiz completes.\n', () => {

  test("Load the next question", async (done) => {
    await adminConnection.emit('load-next-question', true);
    adminConnection.once('load-question', (errorMessage) => {
      expect(true).toBe(true);
      done();
    });
  });


  test("Check the current question is second in the database.", async (done) => {
    expect(currentQuestion.id).toBe(game.questions[2].id);
    done();
  });


  test("Answer question three as (as a player)", async (done) => {
    await playerConnection.emit('submit-answer', {answerId: currentQuestion.id, answerText: "Testing", playerUUID: gamePlayer.uuid });
    playerConnection.once('success', (success) => {
      expect(success).toBe("Answer successfully sent.");
      done();
    });
  });


  test("Mark the answer as correct", async (done) => {
    adminConnection.emit('mark-answer', { answerCorrect: true, playerUUID: gamePlayer.uuid, questionId: currentQuestion.id });
    playerConnection.once('success', (success) => {
      expect(success).toBe(`You got '${currentQuestion.question}' correct.\n`);
      done();
    });
  });


  test("Check the score is correct", async (done) => {
    expect(playerOneScore).toBe(2);
    done();
  });


  test("Load the next question", async (done) => {
    await adminConnection.emit('load-next-question', true);
    adminConnection.once('game-complete', (errorMessage) => {
      expect(true).toBe(true);
      done();
    });
  });


  test("Check the game is completed", async (done) => {
    expect(playerGameCompleted).toBe(true);
    expect(adminGameCompleted).toBe(true);
    done();
  });

});


describe('The game is over! Try to do all the things we shouldn\'t be able to.\n', () => {

  test("Load the next question", async (done) => {
    await adminConnection.emit('load-next-question', true);
    adminConnection.once('general-errors', (errors) => {
      expect(errors).toBe("The game is over!\n");
      done();
    });
  });


  test("Answer question three as (as a player)", async (done) => {
    await playerConnection.emit('submit-answer', {answerId: currentQuestion.id, answerText: "Testing", playerUUID: gamePlayer.uuid });
    playerConnection.once('general-errors', (errors) => {
      expect(errors).toBe("The game is over!\nYou've already answered that question!\n");
      done();
    });
  });


  test("Mark the answer as correct", async (done) => {
    adminConnection.emit('mark-answer', { answerCorrect: true, playerUUID: gamePlayer.uuid, questionId: currentQuestion.id });
    adminConnection.once('general-errors', (errors) => {
      expect(errors).toBe("The game is over!\n");
      done();
    });
  });

});