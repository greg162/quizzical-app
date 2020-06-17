const { v4: uuidv4 } = require('uuid');

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


  removePlayer(uuid) {
    this.players.forEach(function(player, index) { 
      if(player.uuid == uuid) {
        this.players.splice(index, 1);
      }
    }.bind(this));

  }


  givePlayerPoint(uuid, answerCorrect) {
    var returnPlayer = {};
    this.players.forEach(function(player, index) { 
      if(player.uuid == uuid) {
        returnPlayer = player;
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
    };
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
