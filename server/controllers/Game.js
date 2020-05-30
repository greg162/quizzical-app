
class game {

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

  addDBData(dbData) {
    this._id             = dbData._id;
    this.id              = dbData.id;
    this.game_id         = dbData.game_id;
    this.socket_id       = 'game' + dbData.game_id;
    this.name            = dbData.name;
    this.description     = dbData.description;
    this.game_started    = dbData.game_started;
    this.game_completed  = dbData.game_completed;
    this.game_start_time = dbData.game_start_time;
    this.questions       = dbData.questions;
    this.password        = dbData.password;
  }


}
module.exports = game;
