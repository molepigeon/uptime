var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// main model
var CheckMonthlyStat = new Schema({
  check          : { type: Schema.ObjectId, ref: 'Check' },
  timestamp      : Date,
  count          : Number,
  availability   : Number,
  responsiveness : Number,
  responseTime   : Number,
  downtime       : Number,
  periods        : Array,
  tags           : Array
});
CheckMonthlyStat.index({ check: 1, timestamp: -1 }, { unique: true });
CheckMonthlyStat.plugin(require('mongoose-lifecycle'));

module.exports = mongoose.model('CheckMonthlyStat', CheckMonthlyStat);