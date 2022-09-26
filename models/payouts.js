const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema(
  {
    profit_id: { type: String },
    year: { type: Number },
    month: { type: Number },
    app_user_id: { type: String },
    type: { type: Number },
    percentage: { type: Number },
    base_amount: { type: Number },
    amount: { type: Number }
  },
  { timestamps: true }
);

schema.set('toJSON', { getters: true });
schema.options.toJSON.transform = (doc, ret) => {
  const obj = { ...ret };
  delete obj.__v;
  return obj;
};
module.exports = mongoose.model('payouts', schema);
