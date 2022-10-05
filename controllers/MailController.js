const nodemailer = require('nodemailer');

let sendMail = async (receiver_email, subject, html) => {
  var transporter = nodemailer.createTransport({
    host: process.env.MAIL_SERVER,
    port: process.env.MAIL_PORT,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD
    }
  });

  var sender_name = 'Legacy';
  var sender_email = process.env.MAIL_USER;

  let mailOptions = {
    from: `"${sender_name}" <${sender_email}>`, // sender address
    to: receiver_email, // list of receivers
    subject: subject, // Subject line
    // text: 'plain text body', // plain text body
    html: html // html body
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log('Message %s sent: %s', info.messageId, info.response);
    res.render('index');
  });
};

module.exports.sendMail = sendMail;
