var mongoose = require('mongoose');
const { v4: uuidv4 }   = require('uuid');
const AnswersController = require('./Answers.js');



class GameController {

  validPassword(password) {
    var Password = require("node-php-password");
    var options = {
      cost: 10,
    }
    // Valid algorithms are "PASSWORD_DEFAULT", and "PASSWORD_BCRYPT"
    // "PASSWORD_DEFAULT" is just an alias to "PASSWORD_BCRYPT", to be more
    // compatible with PHP
    var passwordVerified = Password.verify(password, this.password);
    return (passwordVerified);

  }


  getGameId() {
    return 'game' + this.game_id;
  }


  disconnectPlayer(uuid) {
    this.players.forEach(function(player, index) { 
      if(player.uuid == uuid) {
        this.players[index].connected = 0;
      }
    }.bind(this));

  }


  givePlayerPoint(playerUuid, answerCorrect, answerText) {
    var returnPlayer = {};
    this.players.forEach(function(player, index) { 
      if(player.uuid == playerUuid) {
        returnPlayer = player;

        let answer = new AnswersController(this.current_question.id, player.uuid, answerText, answerCorrect, 1);
        this.answers.push(answer.answerToObject());

        if(answerCorrect) {
          this.players[index].score++;
        }
      }
    }.bind(this));

    return returnPlayer;
  }


  playerExists(uuid) {
    var playerExists = false;
    this.players.forEach(function(player) { 
      if(player.uuid == uuid) {
        playerExists = true;
      }
    });
    return playerExists;

  }


  questionExists(id) {
    var questionExists = false;
    this.questions.forEach(function(question) { 
      if(question.id == id) {
        questionExists = true;
      }
    });
    return questionExists;

  }

  userAnsweredQuestion(userUuid) {
    var questionAnswered = false;
    this.answers.forEach(function(answer) { 
      if(answer.user_id == userUuid && answer.question_id == this.current_question.id) {
        questionAnswered = true;
      }
    }.bind(this));
    return questionAnswered;

  }


  getQuestion(id) {
    var requestedQuestion = {};
    this.questions.forEach(function(question) { 
      if(question.id == id) {
        requestedQuestion = question;
      }
    });
    return requestedQuestion;

  }


  createNewPlayer(gameJoinData, socketId, game) {
    var playerId        = uuidv4();
    var isAdminPlayer   = Boolean( gameJoinData.password && game.validPassword(gameJoinData.password) );
    var newPlayerObject = {
      uuid: playerId,
      name: gameJoinData.playerName,
      isAdmin: isAdminPlayer,
      score: 0,
      socket_id: socketId,
      avatar: gameJoinData.playerAvatar,
      connected: 1,
    };
    
    return newPlayerObject;

  }


  getLatest() {
    return this.model('Game').findById(this._id);
  }


  findExistingPlayer(uuid, socketId) {

    var newPlayerObject = false;
    this.players.forEach(function(player, index) {
      console.log(player.uuid);
      console.log(uuid);
      if(player.uuid == uuid) {
        console.log('player found');
        newPlayerObject = {
          uuid: player.uuid,
          name: player.name,
          isAdmin: player.isAdmin,
          score: player.score,
          socket_id: socketId,
          avatar: player.avatar,
          connected: 1,
        };
        this.players[index].connected = 1;
        this.players[index].socket_id = socketId;
        if(player.isAdmin) {
          this.admin_socket_id = socketId;
        }
      }
    }.bind(this));

    return newPlayerObject;
  }


  validateNewPlayer(gameJoinData) {
    var errors = "";
    if(!gameJoinData.playerName)                         { errors += "You must enter a name!\n"; }
    if(!gameJoinData.playerAvatar)                       { errors += "You must enter a name!\n"; }
    else if(gameJoinData.playerName.length > 100)        { errors += "Your name cannot be longer than 100 characters!\n"; }
    if(this.have_admin_player && gameJoinData.password ) { errors += "There is already an admin player running this game!\n"; }
    if(this.game_started )                               { errors += "This game has already started!\n"; }
    if(this.game_completed )                             { errors += "This game has finished!\n"; }

    if(gameJoinData.password && gameJoinData.password !== "" && !this.validPassword(gameJoinData.password)) {
      errors += "The password you entered is not valid!\n";
    }
    return errors;
  }

}
module.exports = GameController;
