const { v4: uuidv4 } = require('uuid');


class Players {
  constructor() {
    this.data            = {};
    this.numberOfPlayers = 0;
    this.haveAdminPlayer = false;
  }

  //Add a player to the game
  addPlayer(playerObject) {
    this.data[playerObject.uuid] = playerObject;
    this.numberOfPlayers++;
    if(playerObject.isAdmin) {
      this.haveAdminPlayer = true;
    }
  }

  removePlayer(playerObject) {
    delete this.data[playerObject.uuid];
    this.numberOfPlayers--;
    if(this.numberOfPlayers <= 0 || playerObject.isAdmin) {
      this.haveAdminPlayer = false;
    }
  }

  createNewPlayer(gameJoinData, socketId, game) {
    var playerId = uuidv4();
    var isAdminPlayer = (gameJoinData.password && game.validPassword(gameJoinData.password));
    console.log("Admin player: "+isAdminPlayer);
    var newPlayerObject = {
      uuid: playerId,
      name: gameJoinData.playerName,
      isAdmin: isAdminPlayer,
      score: 0,
      socket_id: socketId,
      avatar: gameJoinData.playerAvatar,
      test: "",
    };

    console.log(newPlayerObject);
    this.addPlayer(newPlayerObject);
    return newPlayerObject;
  }

  validateNewPlayer(gameJoinData, game) {
    var errors = "";
    if(!gameJoinData.playerName)                       { errors += "You must enter a name!\n"; }
    if(!gameJoinData.playerAvatar)                       { errors += "You must enter a name!\n"; }
    else if(gameJoinData.playerName.length > 100)      { errors += "Your name cannot be longer than 100 characters!\n"; }
    if(this.haveAdminPlayer && gameJoinData.password ) { errors += "There is already an admin player running this game!\n"; }

    if(gameJoinData.password && gameJoinData.password !== "" && !game.validPassword(gameJoinData.password)) {
      errors += "The password you entered is not valid!\n";
    }
    return errors;
  }

  givePlayerPoint(uuid, answerCorrect) {
    if(typeof this.data[uuid] !== 'undefined') {
      if(answerCorrect) {
        this.data[uuid].score++;
      }
      return this.data[uuid];
    }
  }

}
module.exports = Players;
