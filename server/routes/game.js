var express      = require('express');
var router       = express.Router();
const GameSchema = require('./../schema/Game.js');


module.exports = function(mongoose) {

/* GET home page. */
  router.get('/:gameId', function(req, res, next) {
    //Sanitize the game ID
    var cleanGameId = req.params.gameId.replace(/[^a-z0-9]/gi,'');

    if(cleanGameId) {
      console.log("Clean GAME ID found:"+cleanGameId);
      var db = mongoose.connection;
      console.log('db connection open');
      let Game = mongoose.model('Game', GameSchema);
      Game.findOne({ game_id: cleanGameId } ,function (err, game) {
        if (err) return console.log(err);
        console.log(game);
      });
    }
    res.render('index', { title: 'Test Application' });

  });

  return router;

};
