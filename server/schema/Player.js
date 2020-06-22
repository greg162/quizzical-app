var mongoose = require('mongoose');


var PlayerSchema = new mongoose.Schema({
  uuid: String,
  name: String,
  isAdmin: Boolean,
  score: Number,
  socket_id: String,
  avatar: String,
  connected: Number,
});

module.exports = PlayerSchema;
