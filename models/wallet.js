const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const wallet = new Schema(
  {
    private: { type: String, required: true, unique: true },
    public: { type: String, required: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, required: true, default: false },
    isBlocked: { type: Boolean, required: true, default: false }
  },
  { timestamps: true }
);

wallet.set('toJSON', { getters: true });
wallet.options.toJSON.transform = (doc, ret) => {
  const obj = { ...ret };
  delete obj.__v;
  return obj;
};
module.exports = mongoose.model('wallet', wallet);
