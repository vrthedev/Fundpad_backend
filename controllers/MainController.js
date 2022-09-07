const Projects = require('../models/projects');
const Pledges = require('../models/pledges');
const Profits = require('../models/profits');
const Payouts = require('../models/payouts');
const AppUsers = require('../models/app_users');
const News = require('../models/news');
const Faqs = require('../models/faqs');
const { createToken, hashPassword2, verifyPassword } = require('../utils/authentication');

const investor_payout_percentage = 50;
const referral_payout_percentage = 10;

exports.test = async (req, res) => {
  return res.json({ result: true, data: 'API running version 1.3' });
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

    const hashedPassword = await hashPassword2(password);

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
      var checkpassword = await verifyPassword(password, user.password);
      if (!checkpassword)
        return res.json({ result: false, data: 'Email and Password is not corret.' });

      user.device_token = device_token;
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
    //send reset password email
    return res.json({ result: true, data: 'success' });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.appuser_changePassword = async (req, res) => {
  try {
    var { email, new_password } = req.body;
    var user = await AppUsers.findOne({ email: email });
    if (user) {
      const hashedPassword = await hashPassword2(new_password);
      user.password = hashedPassword;
      await user.save();
      return res.json({ result: true, data: 'success' });
    } else {
      return res.json({ result: true, data: 'Email is not correct.' });
    }
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.appuser_info = async (req, res) => {
  try {
    var { app_user_id } = req.body;
    console.log(app_user_id);
    var app_user = await AppUsers.findOne({ _id: app_user_id });
    return res.json({ result: true, data: app_user });
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
      input.password = await hashPassword2('12345');

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
    var project = await Projects.findOne();
    var ddd = await Pledges.aggregate([
      { $match: { status: 1 } },
      {
        $group: { _id: null, total_amount: { $sum: '$amount' } }
      }
    ]);
    project.fund_raised = ddd[0] ? ddd[0].total_amount : 0;

    return res.json({ result: true, data: project });
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
    var { investor_id, wallet } = req.body;
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

      //update user wallet
      investor.wallet = wallet;
      await investor.save();

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

// Profits
exports.profit_get = async (req, res) => {
  try {
    var data = await Profits.find();
    return res.json({ result: true, data: data });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.profit_info = async (req, res) => {
  try {
    var { profit_id } = req.body;

    var investor_payouts = await Payouts.find({ profit_id, type: 1 });
    var referral_payouts = await Payouts.find({ profit_id, type: 2 });
    return res.json({
      result: true,
      data: {
        investor_payouts: investor_payouts,
        referral_payouts: referral_payouts
      }
    });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.profit_add = async (req, res) => {
  try {
    var { name, percentage } = req.body;
    var profit_item = await new Profits({ name, percentage }).save();

    await createPayouts(name, profit_item._id, percentage);

    return res.json({ result: true, data: 'success' });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.profit_delete = async (req, res) => {
  try {
    var { _id } = req.body;
    await Profits.findOneAndDelete({ _id: _id });
    await Payouts.deleteMany({ profit_id: _id });
    return res.json({ result: true, data: 'success' });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

const createPayouts = async (profit_name, profit_id, profit_percentage) => {
  //Investor payouts
  /* total pledges of investors
  [
    { _id: '631562089f4d371ac058c78e', total_amount: 500 },
    { _id: '6314de2e3509e4418c2ff06c', total_amount: 2000 }
  ]
  */
  var investors = await Pledges.aggregate([
    {
      $group: {
        _id: '$investor_id',
        total_amount: { $sum: { $cond: [{ $eq: ['$status', 1] }, '$amount', 0] } } //sum of amount for status = 1
      }
    }
  ]);
  var investor_payouts = 0;
  investors.map(async (item) => {
    var final_percentage = (profit_percentage * investor_payout_percentage) / 100;
    var base_amount = item.total_amount;
    var amount = (base_amount * final_percentage) / 100;
    investor_payouts += amount;
    await new Payouts({
      profit_name,
      profit_id: profit_id,
      app_user_id: item._id,
      type: 1,
      base_amount,
      percentage: final_percentage,
      amount
    }).save();
  });

  //Referral payouts
  /* total pledges from user's referres
  [
    { _id: '631562089f4d371ac058c78e', total_amount: 500 },
    { _id: '6314de2e3509e4418c2ff06c', total_amount: 2000 }
  ]
  */
  var referrals = await Pledges.aggregate([
    {
      $group: {
        _id: '$referrer_id',
        total_amount: { $sum: { $cond: [{ $eq: ['$status', 1] }, '$amount', 0] } } //sum of amount for status = 1
      }
    }
  ]);
  var referral_payouts = 0;
  referrals.map(async (item) => {
    var final_percentage = (profit_percentage * referral_payout_percentage) / 100;
    var base_amount = item.total_amount;
    var amount = (base_amount * final_percentage) / 100;
    referral_payouts += amount;
    await new Payouts({
      profit_name,
      profit_id: profit_id,
      app_user_id: item._id,
      type: 2,
      base_amount,
      percentage: final_percentage,
      amount
    }).save();
  });

  //Update Profit
  await Profits.updateOne(
    { _id: profit_id },
    { investor_payouts, referral_payouts },
    { upsert: true }
  );

  return;
};

// News
exports.news_get = async (req, res) => {
  try {
    var data = await News.find();
    return res.json({ result: true, data: data });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.news_upsert = async (req, res) => {
  try {
    var input = req.body;
    var { _id } = req.body;
    if (_id) {
      //update
      await News.updateOne({ _id }, input, { upsert: true });
      return res.json({ result: true, data: 'success' });
    } else {
      //add
      await new News(input).save();
      return res.json({ result: true, data: 'success' });
    }
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.news_delete = async (req, res) => {
  try {
    var { _id } = req.body;
    await News.findOneAndDelete({ _id: _id });
    return res.json({ result: true, data: 'success' });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

// Faq
exports.faq_get = async (req, res) => {
  try {
    var data = await Faqs.find();
    return res.json({ result: true, data: data });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.faq_upsert = async (req, res) => {
  try {
    var input = req.body;
    var { _id } = req.body;
    if (_id) {
      //update
      await Faqs.updateOne({ _id }, input, { upsert: true });
      return res.json({ result: true, data: 'success' });
    } else {
      //add
      await new Faqs(input).save();
      return res.json({ result: true, data: 'success' });
    }
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.faq_delete = async (req, res) => {
  try {
    var { _id } = req.body;
    await Faqs.findOneAndDelete({ _id: _id });
    return res.json({ result: true, data: 'success' });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

//Account
exports.account_info = async (req, res) => {
  try {
    var { app_user_id } = req.body;
    //pledges
    var pledges = await Pledges.find({ investor_id: app_user_id });
    var ddd = await Pledges.aggregate([
      { $match: { investor_id: app_user_id, status: 1 } },
      {
        $group: {
          _id: '$investor_id',
          pledges_sum: { $sum: '$amount' } //sum of amount for status = 1
        }
      }
    ]);
    var pledges_sum = ddd[0] ? ddd[0].pledges_sum : 0;
    //investor_payouts
    var investor_payouts = await Payouts.find({ app_user_id: app_user_id, type: 1 });
    var ddd = await Payouts.aggregate([
      { $match: { app_user_id: app_user_id, type: 1 } },
      {
        $group: {
          _id: '$app_user_id',
          investor_payout_sum: { $sum: '$amount' } //sum of amount for status = 1
        }
      }
    ]);
    var investor_payout_sum = ddd[0] ? ddd[0].investor_payout_sum : 0;
    //referral_payouts
    var referral_payouts = await Payouts.find({ app_user_id: app_user_id, type: 2 });
    var ddd = await Payouts.aggregate([
      { $match: { app_user_id: app_user_id, type: 2 } },
      {
        $group: {
          _id: '$app_user_id',
          referral_payout_sum: { $sum: '$amount' } //sum of amount for status = 1
        }
      }
    ]);
    var referral_payout_sum = ddd[0] ? ddd[0].referral_payout_sum : 0;

    return res.json({
      result: true,
      data: {
        pledges_sum: pledges_sum,
        pledges: pledges,
        investor_payout_sum: investor_payout_sum,
        investor_payouts: investor_payouts,
        referral_payout_sum: referral_payout_sum,
        referral_payouts: referral_payouts
      }
    });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.account_referees = async (req, res) => {
  try {
    var { app_user_id } = req.body;
    var pledges = await Pledges.find({ referrer_id: app_user_id, status: 1 }); //approved pledges from my referral code
    return res.json({ result: true, data: pledges });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};
//Dashbaord
exports.dashboard_index = async (req, res) => {
  try {
    var app_users = await AppUsers.find({}).countDocuments();
    var projects = await Projects.find({}).countDocuments();
    var pledges = await Pledges.find({}).countDocuments();

    var ddd = await Pledges.aggregate([
      { $match: { status: 1 } },
      {
        $group: { _id: null, total_amount: { $sum: '$amount' } }
      }
    ]);
    var total_fund_raised = ddd[0] ? ddd[0].total_amount : 0;

    return res.json({
      result: true,
      data: {
        app_users: app_users,
        projects: projects,
        pledges: pledges,
        total_fund_raised: total_fund_raised
      }
    });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};
