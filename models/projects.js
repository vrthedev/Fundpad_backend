const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema(
  {
    name: { type: String },
    deposit_address: { type: String },
    fund_target: { type: Number },
    fund_raised: { type: Number },
    isActive: { type: Boolean },
    endDate: { type: Date }
  },
  { timestamps: true }
);

schema.set('toJSON', { getters: true });
schema.options.toJSON.transform = (doc, ret) => {
  const obj = { ...ret };
  delete obj.__v;
  return obj;
};
module.exports = mongoose.model('projects', schema);
