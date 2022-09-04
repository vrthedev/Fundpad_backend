const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
  fullname: { type: String },
  email: { type: String },
  dialcode: { type: String },
  phone: { type: String },
  address: { type: String },
  wallet: { type: String },
  password: { type: String },
  referral_code: { type: String },
  referrer_id : { type: String },
  device_token: { type: String },
});

schema.set('toJSON', { getters: true });
schema.options.toJSON.transform = (doc, ret) => {
  const obj = { ...ret };
  delete obj.__v;
  return obj;
};
module.exports = mongoose.model('app_users', schema);
