
class PlayerController {
  constructor() {
    this.data            = {};

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




}
module.exports = PlayerController;
