const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema(
  {
    year: { type: Number },
    month: { type: Number },
    percentage: { type: Number },
    investor_payouts: { type: Number },
    referral_payouts: { type: Number },
    additional_payouts: { type: Number },
  },
  { timestamps: true }
);

schema.set('toJSON', { getters: true });
schema.options.toJSON.transform = (doc, ret) => {
  const obj = { ...ret };
  delete obj.__v;
  return obj;
};
module.exports = mongoose.model('profits', schema);
