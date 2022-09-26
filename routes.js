const jwt = require('jsonwebtoken');
const multer = require('multer');
const Wallet = require('./models/wallet');
const config = require('./config');
const requireAuth = require('./middlewares/requireAuth');
const requireSniper = require('./middlewares/requireSniper');
const requireAdmin = require('./middlewares/requireAdmin');
const requirePresale = require('./middlewares/requirePresale');
const requireNFT = require('./middlewares/requireNFT');
const {
  authenticate,
  register,
  validateRegister,
  changePassword
} = require('./controllers/restController');
const walletController = require('./controllers/walletController');
const authorizationController = require('./controllers/authorizationController');
const settingController = require('./controllers/settingController');
const MainController = require('./controllers/MainController');

const router = require('express').Router();
const path = require('path');

router.post('/authenticate', authenticate);
router.post('/register', validateRegister, register);
router.post('/change-password', requireAuth, changePassword);
//Main
router.post('/test', [], MainController.test);

router.post('/firebase/notification', [], MainController.firebase_notification);
router.post('/notification/get', [], MainController.notification_get);
router.post('/mail/depositAddress', [], MainController.mail_depositaddress);

router.post('/appuser/register', [], MainController.appuser_register);
router.post('/appuser/login', [], MainController.appuser_login);
router.post('/appuser/sendResetpasswordEmail', [], MainController.appuser_sendresetemail);

router.post('/appuser/info', [], MainController.appuser_info);
router.post('/appuser/get', [], MainController.appuser_get);
router.post('/appuser/upsert', [], MainController.appuser_upsert);
router.post('/appuser/changePassword', [], MainController.appuser_changePassword);
router.post('/appuser/delete', [], MainController.appuser_delete);

router.post('/project/get', [], MainController.project_get);
router.post('/project/upsert', [], MainController.project_upsert);
router.post('/project/delete', [], MainController.project_delete);

router.post('/pledge/get', [], MainController.pledge_get);
router.post('/pledge/upsert', [], MainController.pledge_upsert);
router.post('/pledge/delete', [], MainController.pledge_delete);

router.post('/profit/get', [], MainController.profit_get);
router.post('/profit/info', [], MainController.profit_info);
router.post('/profit/add', [], MainController.profit_add);
router.post('/profit/delete', [], MainController.profit_delete);

router.post('/additional/get', [], MainController.additional_get);
router.post('/additional/upsert', [], MainController.additional_upsert);
router.post('/additional/delete', [], MainController.additional_delete);

router.post('/news/get', [], MainController.news_get);
router.post('/news/upsert', [], MainController.news_upsert);
router.post('/news/delete', [], MainController.news_delete);

router.post('/faq/get', [], MainController.faq_get);
router.post('/faq/upsert', [], MainController.faq_upsert);
router.post('/faq/delete', [], MainController.faq_delete);



router.post('/account/info', [], MainController.account_info);
router.post('/account/referrals', [], MainController.account_referrals);

router.post('/dashboard/index', [], MainController.dashboard_index);

//wallets
router.post('/wallet/read', [requireAdmin], walletController.read);
router.post('/wallet/lock', [requireAdmin], walletController.lock);
router.post('/wallet/admin', [requireAdmin], walletController.admin);
//authorization
router.post('/authorization/read', [requireAdmin], authorizationController.read);
router.post('/authorization/add', [requireAdmin], authorizationController.add);
router.post('/authorization/delete', [requireAdmin], authorizationController.delete);
//setting
router.post('/setting/read', [], settingController.read);
router.post('/setting/update', [requireAdmin], settingController.update);
router.post('/setting/delete', [requireAdmin], settingController.delete);

module.exports = (app, io) => {
  app.use('/api', router);
  app.get('*', function (req, res) {
    // console.log(req);
    res.sendFile(path.resolve(__dirname, 'build', 'index.html'));
  });

  app.use((req, res, next) => {
    const error = new Error('Not found');
    error.status = 404;
    next(error);
  });

  app.use((error, req, res, next) => {
    res.status(error.status || 500).json({
      message: error.message
    });
  });

  const onConnection = (socket) => {
    pancakeSnipper.setSocket(io, socket);
    uniswapSnipper.setSocket(io, socket);
    swing.setSocket(io, socket);
  };

  //socket middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      if (!socket.user) {
        const decodedToken = jwt.verify(token, config.jwt.secret, {
          algorithm: 'HS256',
          expiresIn: config.jwt.expiry
        });
        const user = await Wallet.findOne({ private: decodedToken.private });
        socket.user = user.toJSON();
      }
    } catch (error) {
      socket.emit('error');
    }
    next();
  });
  io.on('connection', onConnection);
};
