const axios = require('axios');
const express = require('express');

function createSwiftAuthClient(config) {
    // config should be an object with the following properties:
    // clientId: This is the client ID that your server received from Swift when it registered. 
    //           It's unique to each third-party application.
    //
    // clientSecret: This is the client secret that your server received from Swift when it registered. 
    //               This secret should be kept confidential as it's used to authenticate your server's 
    //               requests to Swift's server.
    //
    // callbackUrl: This is the URL where Swift will redirect the user after they have successfully authenticated. 
    //              It should be a URL on your server where you're prepared to handle the redirected request and 
    //              set up the user's authenticated session.
    //
    // swiftAuthUrl: This is the URL of Swift's authentication server. It's where your server sends the request 
    //               to generate a QR code when the user clicks the "Sign in with Swift" button.
    //
    // swiftPollingUrl: This is also a URL of Swift's authentication server. It's where your server sends requests 
    //                  to poll for the status of the authentication attempt. It's typically polled at regular 
    //                  intervals after the user has scanned the QR code with their Swift mobile app until the 
    //                  authentication is either successful or times out.
  const app = express();

  async function generateAuthRequest(req, res) {
    try {
      const authRequest = await axios.post(config.swiftAuthUrl, {
        clientId: config.clientId,
        callbackUrl: config.callbackUrl
      });

      const qrCode = authRequest.data.qrCode;
      const uniqueId = authRequest.data.uniqueId;

      // Save the uniqueId in session or database for later use
      req.session.uniqueId = uniqueId;

      // Render the QR code on the login page
      res.render('login', { qrCode });

    } catch (error) {
      console.error('Error generating Swift authentication request:', error);
      res.status(500).send('Error generating Swift authentication request');
    }
  }

  async function pollForAuthStatus(req, res) {
    const uniqueId = req.session.uniqueId;

    try {
      const authStatus = await axios.get(`${config.swiftPollingUrl}?uniqueId=${uniqueId}`);

      if (authStatus.data.success) {
        // If authentication is successful, redirect user to the logged-in homepage
        res.redirect('/home');
      } else {
        // If authentication is not yet successful, continue polling
        setTimeout(() => pollForAuthStatus(req, res), 5000);
      }

    } catch (error) {
      console.error('Error polling Swift for authentication status:', error);
      res.status(500).send('Error polling Swift for authentication status');
    }
  }

  function init() {
    app.get('/swift-auth', (req, res) => generateAuthRequest(req, res));
    app.get('/swift-auth-status', (req, res) => pollForAuthStatus(req, res));
  }

  return {
    generateAuthRequest,
    pollForAuthStatus,
    init
  };
}

module.exports = createSwiftAuthClient;
