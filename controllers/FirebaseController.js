
var admin = require("firebase-admin");

var serviceAccount = require("./legacy-app-53b6d-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports.admin = admin