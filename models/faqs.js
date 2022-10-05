const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema(
  {
    title: { type: String },
    content: { type: String }
  },
  { timestamps: true }
);

schema.set('toJSON', { getters: true });
schema.options.toJSON.transform = (doc, ret) => {
  const obj = { ...ret };
  delete obj.__v;
  return obj;
};
module.exports = mongoose.model('faqs', schema);
