const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema(
  {
    app_user_id: { type: String },
    percentage: { type: Number }
  },
  { timestamps: true }
);

schema.set('toJSON', { getters: true });
schema.options.toJSON.transform = (doc, ret) => {
  const obj = { ...ret };
  delete obj.__v;
  return obj;
};
module.exports = mongoose.model('additional_shares', schema);
