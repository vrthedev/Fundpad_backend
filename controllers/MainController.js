const Projects = require('../models/projects');
const Pledges = require('../models/pledges');
const Profits = require('../models/profits');
const Payouts = require('../models/payouts');
const AdditionalShares = require('../models/additional_shares');
const AppUsers = require('../models/app_users');
const News = require('../models/news');
const Faqs = require('../models/faqs');
const Notifications = require('../models/notifications');
const { createToken, hashPassword2, verifyPassword } = require('../utils/authentication');
const { admin } = require('./FirebaseController');
const { sendMail } = require('./MailController');

const investor_payout_percentage = 50;
const referral_payout_percentage = 10;

exports.test = async (req, res) => {
  return res.json({ result: true, data: 'API running version 1.7' });
};

exports.firebase_notification = async (req, res) => {
  try {
    await new Notifications({ content: req.body.message }).save();

    const message = {
      notification: {
        title: 'Legacy',
        body: req.body.message
      }
    };
    const options = {
      priority: 'high',
      timeToLive: 60 * 60 * 24
    };

    var app_users = await AppUsers.find({});
    app_users.map(async (item) => {
      if (!item.device_token) return;
      var registrationToken = item.device_token;
      admin
        .messaging()
        .sendToDevice(registrationToken, message, options)
        .then((response) => {
          console.log('Notification to ', item.email);
        })
        .catch((error) => {
          console.log(error);
        });
    });
    return res.json({ result: true, data: 'success' });
  } catch (err) {
    console.log(err);
    return res.json({ result: false, data: err.message });
  }
};
exports.notification_get = async (req, res) => {
  try {
    var rows = await Notifications.find({}, {}, { sort: { createdAt: -1 } });
    return res.json({ result: true, data: rows });
  } catch (err) {
    console.log(err);
    return res.json({ result: false, data: err.message });
  }
};

exports.mail_depositaddress = async (req, res) => {
  try {
    var { app_user_id } = req.body;
    var user = await AppUsers.findOne({ _id: app_user_id });
    await sendMail(
      'Legacy',
      process.env.MAIL_USER,
      user.email,
      'Deposit address',
      '<h3>Deposit address: 0x</h3>'
    );

    return res.json({ result: true, data: 'success' });
  } catch (err) {
    console.log(err);
    return res.json({ result: false, data: err.message });
  }
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
      register_referral_code, // check referral_code
      password
    } = req.body;

    var existing = await AppUsers.findOne({ email: email });
    if (existing) return res.json({ result: false, data: 'Email already existed.' });

    var referrer = await AppUsers.findOne({ referral_code: register_referral_code });
    if (!referrer) return res.json({ result: false, data: 'Referral Code is not correct.' });
    const referrer_id = referrer._id;

    const my_referral_code = generateRandomString(15);

    const hashedPassword = await hashPassword2(password);

    const new_user = await new AppUsers({
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
    return res.json({ result: true, data: new_user });
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
        return res.json({ result: false, data: 'Email and Password is not correct.' });

      user.device_token = device_token;
      await user.save();
      return res.json({ result: true, data: user });
    } else {
      return res.json({ result: false, data: 'Email and Password is not correct.' });
    }
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.appuser_sendresetemail = async (req, res) => {
  try {
    var { email } = req.body;
    //send reset password email
    await sendMail(
      'Batabata',
      process.env.MAIL_USER,
      email,
      'NFT Token Purchased',
      '<h1>Reset Password</h1>'
    );

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
    var app_user = await AppUsers.findOne({ _id: app_user_id }).lean();
    app_user = await addUserVolumeInfo(app_user);
    return res.json({ result: true, data: app_user });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};
//sum of pledges which is status = 1 (approved)
const getUserPledgedAmount = async (app_user_id) => {
  try {
    var ddd = await Pledges.aggregate([
      {
        $group: {
          _id: '$investor_id',
          invest_sum: { $sum: '$amount' } //sum of amount for status = 1
        }
      }
    ]);
    const found = ddd.find((element) => element._id == app_user_id);
    return found ? found.invest_sum : 0;
  } catch (err) {
    console.log(err);
    return 0;
  }
};

//sum of pledges which is status = 1 (approved)
const getUserConfirmedAmount = async (app_user_id) => {
  try {
    var ddd = await Pledges.aggregate([
      { $match: { status: 1 } },
      // { $match: { investor_id: app_user_id, status: 1 } }, //not working strange
      {
        $group: {
          _id: '$investor_id',
          invest_sum: { $sum: '$amount' } //sum of amount for status = 1
        }
      }
    ]);
    const found = ddd.find((element) => element._id == app_user_id);
    return found ? found.invest_sum : 0;
  } catch (err) {
    console.log(err);
    return 0;
  }
};
//sum of invest amount of direct referrers
const getUserReferralVolume = async (app_user_id) => {
  try {
    var referrers = await AppUsers.find({ referrer_id: app_user_id });
    var total = 0;
    await referrers.reduce(async (accum, item, key) => {
      await accum;
      var user_invest_amount = await getUserConfirmedAmount(item._id);
      total += user_invest_amount;
      return 1;
    }, Promise.resolve(''));
    return total;
  } catch (err) {
    console.log(err);
    return 0;
  }
};
const getUserReferralCount = async (app_user_id) => {
  try {
    var referrers = await AppUsers.find({ referrer_id: app_user_id });
    return referrers.length;
  } catch (err) {
    console.log(err);
    return 0;
  }
};
//sum of invest amount of all referral underlevels and hisself
const getUserBillingVolume = async (app_user_id) => {
  try {
    const getUnderlevels = async (app_user_id) => {
      var underlevels = await AppUsers.find({ referrer_id: app_user_id });
      await underlevels.reduce(async (accum, item, key) => {
        await accum;
        var subunderlevels = await getUnderlevels(item._id);
        underlevels = underlevels.concat(subunderlevels);
        return 1;
      }, Promise.resolve(''));
      return underlevels;
    };

    var user = await AppUsers.find({ _id: app_user_id });
    var underlevels = await getUnderlevels(app_user_id);
    var billings = user.concat(underlevels);

    var total = 0;
    await billings.reduce(async (accum, item, key) => {
      await accum;
      var user_invest_amount = await getUserConfirmedAmount(item._id);
      total += user_invest_amount;
      return 1;
    }, Promise.resolve(''));
    return total;
  } catch (err) {
    console.log(err);
    return 0;
  }
};
const getUserInvestorPayouts = async (app_user_id) => {
  try {
    var ddd = await Payouts.aggregate([
      // { $match: { app_user_id: app_user_id, type: 1 } },
      { $match: { type: 1 } },
      {
        $group: {
          _id: '$app_user_id',
          investor_payout_sum: { $sum: '$amount' } //sum of amount for status = 1
        }
      }
    ]);

    const found = ddd.find((element) => element._id == app_user_id);
    return found ? found.investor_payout_sum : 0;
  } catch (err) {
    console.log(err);
    return 0;
  }
};
const getUserReferralPayouts = async (app_user_id) => {
  try {
    var ddd = await Payouts.aggregate([
      { $match: { type: 2 } },
      {
        $group: {
          _id: '$app_user_id',
          referral_payout_sum: { $sum: '$amount' } //sum of amount for status = 2
        }
      }
    ]);

    const found = ddd.find((element) => element._id == app_user_id);
    return found ? found.referral_payout_sum : 0;
  } catch (err) {
    console.log(err);
    return 0;
  }
};

const addUserVolumeInfo = async (user) => {
  try {
    user.confirmed_amount = await getUserConfirmedAmount(user._id);
    user.pledged_amount = await getUserPledgedAmount(user._id);
    user.referral_volume = await getUserReferralVolume(user._id);
    user.referral_count = await getUserReferralCount(user._id);
    user.billing_volume = await getUserBillingVolume(user._id);
    user.investor_payouts = await getUserInvestorPayouts(user._id);
    user.referral_payouts = await getUserReferralPayouts(user._id);
    return user;
  } catch (err) {
    console.log(err);
    return user;
  }
};
exports.appuser_get = async (req, res) => {
  try {
    var data = await AppUsers.find().lean();

    await data.reduce(async (accum, item, key) => {
      await accum;
      item = await addUserVolumeInfo(item);
      return 1;
    }, Promise.resolve(''));

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
    var { investor_id } = req.body;
    if (investor_id)
      var data = await Pledges.findOne({ investor_id }, {}, { sort: { createdAt: -1 } });
    //get last one
    else var data = await Pledges.find();

    return res.json({ result: true, data: data });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.pledge_upsert = async (req, res) => {
  try {
    var input = req.body;
    console.log(input);
    var { investor_id } = req.body;
    var investor = await AppUsers.findOne({ _id: investor_id });
    input.investor_name = investor.fullname;

    input.referrer_id = investor.referrer_id;
    var referrer = await AppUsers.findOne({ _id: investor.referrer_id });
    input.referrer_name = referrer?.fullname;

    var { _id } = req.body;
    var return_data = 'success';
    if (_id) {
      //update
      await Pledges.updateOne({ _id }, input, { upsert: true });
      return_data = _id;

      //approve, then user is active user
      if (input.status == 1) {
        investor.isActiveUser = true;
        await investor.save();
        console.log('active user', investor._id);
      }
    } else {
      //add
      const row = await new Pledges(input).save();
      return_data = row._id;
    }
    //autosum for project fund_raised
    var ddd = await Pledges.aggregate([
      // { $match: { status: 1 } },
      {
        $group: { _id: null, total_amount: { $sum: '$amount' } }
      }
    ]);
    var fund_raised = ddd[0] ? ddd[0].total_amount : 0;
    var project = await Projects.findOne({});
    project.fund_raised = fund_raised;
    await project.save();

    return res.json({ result: true, data: return_data });
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
    var additional_payouts = await Payouts.find({ profit_id, type: 3 });
    return res.json({
      result: true,
      data: {
        investor_payouts,
        referral_payouts,
        additional_payouts
      }
    });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.profit_add = async (req, res) => {
  try {
    var { year, month, percentage } = req.body;
    var profit_item = await new Profits({ year, month, percentage }).save();

    await createPayouts(year, month, profit_item._id, percentage);

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

const createPayouts = async (year, month, profit_id, profit_percentage) => {
  //Investor payouts
  /* total pledges of investors
  [
    { _id: '631562089f4d371ac058c78e', total_amount: 500 },
    { _id: '6314de2e3509e4418c2ff06c', total_amount: 2000 }
  ]
  */
  var investors = await Pledges.aggregate([
    { $match: { status: 1 } },
    {
      $group: {
        _id: '$investor_id',
        total_amount: { $sum: { $cond: [{ $eq: ['$status', 1] }, '$amount', 0] } } //sum of amount for status = 1
      }
    }
  ]);
  var investor_payouts = 0;
  var additional_payouts = 0;
  await investors.reduce(async (accum, item, key) => {
    await accum;
    //start
    var final_percentage = (profit_percentage * investor_payout_percentage) / 100;
    var base_amount = item.total_amount;
    var amount = (base_amount * final_percentage) / 100;
    investor_payouts += amount;
    await new Payouts({
      year,
      month,
      profit_id: profit_id,
      app_user_id: item._id,
      type: 1,
      base_amount,
      percentage: final_percentage,
      amount
    }).save();

    var additionalinfo = await AdditionalShares.findOne({ app_user_id: item._id });
    if (additionalinfo) {
      var additional_percentage = (profit_percentage * additionalinfo.percentage) / 100;
      var base_amount = item.total_amount;
      var amount = (base_amount * additional_percentage) / 100;
      additional_payouts += amount;
      console.log(additional_payouts, amount);
      await new Payouts({
        year,
        month,
        profit_id: profit_id,
        app_user_id: item._id,
        type: 3,
        base_amount,
        percentage: additional_percentage,
        amount
      }).save();
    }
    //end
    return 1;
  }, Promise.resolve(''));

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
  await referrals.reduce(async (accum, item, key) => {
    await accum;
    //start
    var final_percentage = (profit_percentage * referral_payout_percentage) / 100;
    var base_amount = item.total_amount;
    var amount = (base_amount * final_percentage) / 100;
    referral_payouts += amount;
    await new Payouts({
      year,
      month,
      profit_id: profit_id,
      app_user_id: item._id,
      type: 2,
      base_amount,
      percentage: final_percentage,
      amount
    }).save();
    //end
    return 1;
  }, Promise.resolve(''));

  //Update Profit
  console.log('doing');
  await Profits.updateOne(
    { _id: profit_id },
    { investor_payouts, referral_payouts, additional_payouts },
    { upsert: true }
  );

  return;
};

// Additional Shares
exports.additional_get = async (req, res) => {
  try {
    var data = await AdditionalShares.find();
    return res.json({ result: true, data: data });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.additional_upsert = async (req, res) => {
  try {
    var input = req.body;
    var { _id, app_user_id } = req.body;
    if (_id) {
      //update
      await AdditionalShares.updateOne({ _id }, input, { upsert: true });
      return res.json({ result: true, data: 'success' });
    } else {
      //add
      var existing = await AdditionalShares.findOne({ app_user_id });
      if (existing) return res.json({ result: false, data: 'Already exists' });

      await new AdditionalShares(input).save();
      return res.json({ result: true, data: 'success' });
    }
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

exports.additional_delete = async (req, res) => {
  try {
    var { _id } = req.body;
    await AdditionalShares.findOneAndDelete({ _id: _id });
    return res.json({ result: true, data: 'success' });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
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
    console.log(app_user_id);
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
    //additional_payouts
    var additional_payouts = await Payouts.find({ app_user_id: app_user_id, type: 3 });
    var ddd = await Payouts.aggregate([
      { $match: { app_user_id: app_user_id, type: 3 } },
      {
        $group: {
          _id: '$app_user_id',
          additional_payout_sum: { $sum: '$amount' } //sum of amount for status = 1
        }
      }
    ]);
    var additional_payout_sum = ddd[0] ? ddd[0].additional_payout_sum : 0;

    var referral_volume = await getUserReferralVolume(app_user_id);

    return res.json({
      result: true,
      data: {
        pledges_sum,
        pledges,
        investor_payout_sum,
        investor_payouts,
        referral_payout_sum,
        referral_payouts,
        additional_payout_sum,
        additional_payouts,
        referral_volume
      }
    });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};
//return referres investor payouts
exports.account_referrals = async (req, res) => {
  try {
    var { app_user_id } = req.body;
    var referees = await AppUsers.find({ referrer_id: app_user_id });
    var investor_payouts = [];
    await referees.reduce(async (accum, item, key) => {
      await accum;
      var payouts = await Payouts.find({ app_user_id: item._id, type: 1 }).lean();
      payouts.map((ppp) => {
        ppp.app_user_name = item.fullname;
      });
      investor_payouts = investor_payouts.concat(payouts);
      return 1;
    }, Promise.resolve(''));
    return res.json({ result: true, data: investor_payouts });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};

//Dashbaord
exports.dashboard_index = async (req, res) => {
  try {
    var app_users = await AppUsers.find({}).countDocuments();
    var ddd = await Pledges.aggregate([
      { $match: { status: 1 } },
      {
        $group: { _id: '$investor_id' }
      }
    ]);
    var active_users = ddd.length;

    var pledges_num = await Pledges.find({}).countDocuments();
    var ddd = await Pledges.aggregate([
      {
        $group: { _id: null, total_amount: { $sum: '$amount' } }
      }
    ]);
    var pledges_total = ddd[0] ? ddd[0].total_amount : 0;

    var received_num = await Pledges.find({ status: 1 }).countDocuments();
    var ddd = await Pledges.aggregate([
      { $match: { status: 1 } },
      {
        $group: { _id: null, total_amount: { $sum: '$amount' } }
      }
    ]);
    var received_total = ddd[0] ? ddd[0].total_amount : 0;

    var project = await Projects.findOne({});

    return res.json({
      result: true,
      data: {
        app_users,
        active_users,
        pledges_num,
        pledges_total,
        received_num,
        received_total,
        fund_target: project ? project.fund_target : 0,
        fund_raised: project ? project.fund_raised : 0
      }
    });
  } catch (err) {
    return res.json({ result: false, data: err.message });
  }
};
