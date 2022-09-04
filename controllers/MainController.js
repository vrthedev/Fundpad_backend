const Projects = require('../models/projects');
const Pledges = require('../models/pledges');
const Profits = require('../models/profits');
const Payouts = require('../models/payouts');
const AppUsers = require('../models/app_users');

exports.test = async (req, res) => {
  return res.json({ result: true, data: 'API running' });
};

// AppUsers
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
