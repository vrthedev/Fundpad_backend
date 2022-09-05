const Projects = require('../models/projects');
const Pledges = require('../models/pledges');
const Profits = require('../models/profits');
const Payouts = require('../models/payouts');
const AppUsers = require('../models/app_users');
const { createToken, hashPassword, verifyPassword } = require('../utils/authentication');

exports.test = async (req, res) => {
  return res.json({ result: true, data: 'API running' });
};

// AppUsers
exports.appuser_register = async (req, res) => {
  try {
    var {
      fullname,
      email,
      device_token,
      dialcode, //optional
      phone, //optional
      wallet, //optional
      address, //optional
      referral_code, // check referral_code
      password
    } = req.body;

    var existing = await AppUsers.findOne({ email: email });
    if (existing) return res.json({ result: false, data: 'Email already existed.' });

    var referrer = await AppUsers.findOne({ referral_code: referral_code });
    if (!referrer) return res.json({ result: false, data: 'Referral Code is not correct.' });
    const referrer_id = referrer._id;

    const my_referral_code = generateRandomString(15);

    const hashedPassword = await hashPassword(password);

    await new AppUsers({
      fullname: fullname,
      email: email,
      device_token: device_token,
      dialcode: dialcode,
      phone: phone,
      wallet: wallet,
      address: address,
      referrer_id: referrer_id,
      referral_code: my_referral_code,
      password: hashedPassword
    }).save();
    return res.json({ result: true, data: 'success' });
  } catch (err) {
    console.log(err);
    return res.json({ result: false, data: err.message });
  }
};

function generateRandomString(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

exports.appuser_login = async (req, res) => {
  try {
    var { email, password, device_token } = req.body;
    var user = await AppUsers.findOne({ email: email });
    if (user) {
      //~~check password
      user.device_token = device_token;
      console.log(user);
      await user.save();
      return res.json({ result: true, data: user });
    } else {
      return res.json({ result: false, data: 'Email and Password is not corret.' });
    }
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.appuser_sendresetemail = async (req, res) => {
  try {
    var { email } = req.body;
    return res.json({ result: true, data: 'success' });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.appuser_get = async (req, res) => {
  try {
    var data = await AppUsers.find();
    return res.json({ result: true, data: data });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.appuser_upsert = async (req, res) => {
  try {
    var input = req.body;
    var { _id } = req.body;
    if (_id) {
      //update
      await AppUsers.updateOne({ _id }, input, { upsert: true });
      return res.json({ result: true, data: 'success' });
    } else {
      //add
      var existing = await AppUsers.findOne({ email: input.email });
      if (existing) return res.json({ result: false, data: 'Email already existed.' });

      input.referral_code = generateRandomString(15);
      input.password = await hashPassword('12345');

      await new AppUsers(input).save();
      return res.json({ result: true, data: 'success' });
    }
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.appuser_delete = async (req, res) => {
  try {
    var { _id } = req.body;
    await AppUsers.findOneAndDelete({ _id: _id });
    return res.json({ result: true, data: 'success' });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

// Projects
exports.project_get = async (req, res) => {
  try {
    var data = await Projects.find();
    return res.json({ result: true, data: data });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.project_upsert = async (req, res) => {
  try {
    var input = req.body;
    var { _id } = req.body;
    if (_id) {
      //update
      await Projects.updateOne({ _id }, input, { upsert: true });
      return res.json({ result: true, data: 'success' });
    } else {
      //add
      var count = await Projects.find({}).countDocuments();
      if (count) return res.json({ result: false, data: 'There is already project.' });
      await new Projects(input).save();
      return res.json({ result: true, data: 'success' });
    }
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.project_delete = async (req, res) => {
  try {
    var { _id } = req.body;
    await Projects.findOneAndDelete({ _id: _id });
    return res.json({ result: true, data: 'success' });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

// Pledges
exports.pledge_get = async (req, res) => {
  try {
    var data = await Pledges.find();
    return res.json({ result: true, data: data });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.pledge_upsert = async (req, res) => {
  try {
    var input = req.body;
    var { investor_id } = req.body;
    var investor = await AppUsers.findOne({ _id: investor_id });
    input.referrer_id = investor.referrer_id;

    var { _id } = req.body;
    if (_id) {
      //update
      await Pledges.updateOne({ _id }, input, { upsert: true });
      return res.json({ result: true, data: 'success' });
    } else {
      //add
      await new Pledges(input).save();
      return res.json({ result: true, data: 'success' });
    }
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.pledge_delete = async (req, res) => {
  try {
    var { _id } = req.body;
    await Pledges.findOneAndDelete({ _id: _id });
    return res.json({ result: true, data: 'success' });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

//Dashbaord
exports.dashboard_index = async (req, res) => {
  try {
    return res.json({
      result: true,
      data: {
        projects: 1,
        pledges: 12,
        total_fund_raised: 12000
      }
    });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};
