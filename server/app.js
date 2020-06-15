var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var _ = require('lodash');
var config = require('./_config');



var app = express();


var customPort = 80;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.set('port', process.env.PORT || customPort);


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;


//Load modules for the websocket system and DB
const server = require('http').Server(app);
const io     = require('socket.io')(server);
var mongoose = require('mongoose');


//Load the controllers
const QuestionsController = require('./controllers/Questions.js');
const TableController     = require('./controllers/Tables.js');
const PlayerController    = require('./controllers/Player.js');
const GameController      = require('./controllers/Game.js');


server.listen(1337);


var QuestionSchema = new mongoose.Schema({
  id: String,
  created_at: Date,
  updated_at: Date,
  quiz_id: Number,
  user_id: Number,
  type: String,
  question: String,
  answer_1: String,
  answer_2: String,
  answer_3: String,
  answer_4: String,
  answer_5: String,
  answer_6: String,
  correct_answer: String,
});


var CurrentQuestionSchema = new mongoose.Schema({
  id: String,
  created_at: Date,
  updated_at: Date,
  quiz_id: Number,
  user_id: Number,
  type: String,
  question: String,
  answer_1: String,
  answer_2: String,
  answer_3: String,
  answer_4: String,
  answer_5: String,
  answer_6: String,
  correct_answer: String,
  marked: Number,
});

var PlayerSchema = new mongoose.Schema({
  uuid: String,
  name: String,
  isAdmin: Boolean,
  score: Number,
  socket_id: String,
  avatar: String,
});

PlayerSchema.loadClass(PlayerController);


var GameSchema = new mongoose.Schema({
  id: Number,
  game_id: String,
  name: String,
  description: String,
  password: String,
  game_started: Number,
  game_completed: Number,
  game_start_time: Date,
  questions: [QuestionSchema],
  current_question: CurrentQuestionSchema,
  admin_socket_id: String,
  players: [PlayerSchema],
  number_of_players: Number,
  have_admin_player: Boolean,
});

GameSchema.loadClass(GameController);



GameSchema.methods.getGameId = function() {
  return 'game' + this.id;
}

GameSchema.methods.getLatest = function() {
  return this.model('Game').findById(this._id);
};


mongoose.connect(config.mongoDatabaseString, {useNewUrlParser: true, useUnifiedTopology: true});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {


  let Game            = mongoose.model('Game', GameSchema);
  let tables          = new TableController;

  io.on('connection', (socket) => {

    console.log('A new user connected');

    //Add a user to the socket.game
    socket.on('join-game', function(gameJoinData) {

      console.log("Starting game joining process...")

      /* --- START AND LEAVE GAME SOCKETS --- */
      Game.findOne({ game_id: gameJoinData.roomId } ,function (err, game) {
        if (err) return console.error(err);
        if(game !== null) {
          console.log('Game found!')
          socket.game = game;
          if(tables.tableIdExists(gameJoinData.tableId)) {
            console.log('User is joining Game ID '+socket.game.getGameId());
            socket.join(socket.game.getGameId());

            var errors = socket.game.validateNewPlayer(gameJoinData, socket.game);
            if(errors) {
              socket.emit('login-errors', errors);
            } else {

              socket.player = socket.game.createNewPlayer(gameJoinData, socket.id, socket.game);
              socket.game.players.push(socket.player);
              if(socket.player.isAdmin) {
                socket.game.have_admin_player = 1,
                socket.game.admin_socket_id   = socket.id;
              }
              socket.game.save();

              tableIndex = tables.data.findIndex(x => x.id === gameJoinData.tableId);
              tables.data[tableIndex].players.push(socket.player.uuid);
              socket.emit('success', 'You haver successfully joined the \''+socket.game.name+'\' socket.game!');
              socket.emit('user-uuid', socket.player.uuid);
              socket.emit('user-admin', socket.player.isAdmin);
              socket.to(socket.game.getGameId()).emit('chat-notifications', socket.player.name+" has joined the chat.");
              
              //Send the new player to players who have already joined.
              socket.to(socket.game.getGameId()).emit('add-player', socket.player);


              _.map(socket.game.players, function(player, key) {
                if(player.socket_id !== socket.id) {
                  socket.emit('add-player', player);
                }
              });
            }
          } else {
            socket.emit('login-errors', 'We could not find that table');
          }
        } else {
          socket.emit('login-errors', 'We could not find that Room, please try again!');
        }
      });
    });


    socket.on('start-game', async function(startGame) {
      var errors = "";
      if(!startGame)             { errors += "Start socket.game variable not detected!"; }
      if(!socket.game.game_id)   { errors += "We could not find the game that should be starting"; }
      if(!socket.player.isAdmin) { errors += "You are not an admin player.\h"; }
      if(errors) { socket.emit('general-errors', errors); }
      else {
        //Refresh the game to ensure that we have all the players
        socket.game =  await Game.findOne({game_id: socket.game.game_id}).exec().catch((err) => {
          console.log(err)
        });
        if(!socket.game) { socket.disconnect(); } //If we've lost the game, just disconnect the user.

        socket.game.game_started = 1;
        socket.game.save();

        socket.questions = new QuestionsController(socket.game.questions);

        socket.game.current_question = socket.questions.loadNextQuestion();
        socket.game.save();
        socket.to(socket.game.getGameId()).emit('load-question', socket.game.current_question);
        socket.emit('load-question', socket.game.current_question);

        //Start the socket.game
        socket.emit('game-started', true);
        socket.to(socket.game.getGameId()).emit('game-started', true);
      }

    });


    socket.on('disconnect', () => {
      if(socket.player) {
        socket.game.removePlayer(socket.player.uuid);
        socket.game.save();
        socket.to(socket.game.getGameId()).emit('chat-notifications', socket.player.name+" has left the chat.");
        socket.to(socket.game.getGameId()).emit('remove-player', socket.player.uuid);
      }
      console.log('user disconnected');
    });

    socket.on('chat-message', (msg) => {
      console.log("Chat message submitted... passing back!");
      if(typeof socket.game.game_id !== 'undefined' && socket.game.game_id) {
        console.log('Game found... emitting message');
        var message  = _.clone(socket.player);
        message.text = msg;
        socket.to(socket.game.getGameId()).emit('chat-message', message);
      } else {
        console.log('Game not found! Skipping message')
      }
    });


    /* --- QUIZ SOCKETS --- */
    socket.on('submit-answer',  async (answerForMarking) => {
      console.log('Answer received for marking... passing to the admin.');
      var errors = "";
      //Update the game to ensure we have the correct admin socket
      console.log("game ID"+socket.game.game_id)
      socket.game =  await Game.findOne({game_id: socket.game.game_id}).exec().catch((err) => {
        console.log(err)
      });
      if(!socket.game)                                                  { socket.disconnect(); } //If we've lost the game, just disconnect the user.
      if(answerForMarking.answerId !== socket.game.current_question.id) { errors += "We're not marking that question anymore. :-(\n"; }
      if(!answerForMarking.answerText)                                  { errors += "You must enter an answer for marking!\n"; }
      if(errors) { socket.emit('general-errors', errors); }
      else {
        console.log("Passing answer to admin for marking:"+socket.game.admin_socket_id)
        io.to(socket.game.admin_socket_id).emit('answer-for-marking', answerForMarking);
      }
    });


    socket.on('mark-answer', (markedAnswer) => {
      console.log('Admin has marked answer... passing back to user.');
      //Carry out basic validation
      var errors = "";

      if(typeof markedAnswer.questionId == 'undefined')             { errors += "No question ID was sent.\n"; }
      else if(!socket.game.questionExists(markedAnswer.questionId)) { errors += "Could not find that question.\n"; }
      if(typeof markedAnswer.playerUUID == 'undefined')             { errors += "No player ID was sent.\n"; }
      else if(!socket.game.playerExists(markedAnswer.playerUUID))   { errors += "Could not find that player.\n"; }
      if(typeof markedAnswer.answerCorrect == 'undefined')          { errors += "Answer correct value not sent.\n"; }
      if(!socket.player.isAdmin)                                    { errors += "You are not an admin player.\h"; }

      //If the validation passes, update the players score and sent them a confirmation message.
      if(errors) { socket.emit('general-errors', errors); }
      else {
        var updatedPlayer = socket.game.givePlayerPoint(markedAnswer.playerUUID, markedAnswer.answerCorrect);
        socket.game.save();
        var question      = _.clone(socket.game.getQuestion(markedAnswer.questionId));
        console.log(question);
        console.log(updatedPlayer.socket_id);
        if(typeof updatedPlayer.score !== 'undefined') {
          socket.emit('updated-player-score', updatedPlayer.score, updatedPlayer.uuid);
          socket.to(socket.game.getGameId()).emit('updated-player-score', updatedPlayer.score, updatedPlayer.uuid);
          if( typeof updatedPlayer.socket_id !== 'undefined') {
            if(markedAnswer.answerCorrect) {
              io.to(updatedPlayer.socket_id).emit('success', `You got '${question.question}' correct.\n`);
            } else {
              io.to(updatedPlayer.socket_id).emit('general-errors', `You got '${question.question}' wrong :*******(.\n`);
            }
            io.to(updatedPlayer.socket_id).emit('question-marked', question.id);

          }
        }
      }
    });


    socket.on('load-next-question', (nextQuestion) => {
      var errors = "";
      if(!nextQuestion)          { errors += "You don't want to load the next question.\n"; }
      if(!socket.player.isAdmin) { errors += "You are not an admin player.\h"; }
      if(errors)                 { socket.emit('general-errors', errors); }
      else {
        if(socket.questions.noMoreQuestions) {
          socket.game.game_completed = 1;
          socket.game.save();
          socket.to(socket.game.getGameId()).emit('game-complete', true);
          socket.emit('game-complete', true);
        } else {
          socket.game.current_question = socket.questions.loadNextQuestion();
          socket.game.save();
          socket.to(socket.game.getGameId()).emit('load-question', socket.game.current_question);
          socket.emit('load-question', socket.game.current_question);
        }
      }
    });


  });


});