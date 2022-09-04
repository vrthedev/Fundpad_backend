const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
  investor_id: { type: String },
  referrer_id : { type: String },
  referrer_id: { type: String },
  amount: { type: Number },
  transaction: { type: String },
  status: { type: Number }
});

schema.set('toJSON', { getters: true });
schema.options.toJSON.transform = (doc, ret) => {
  const obj = { ...ret };
  delete obj.__v;
  return obj;
};
module.exports = mongoose.model('pledges', schema);
