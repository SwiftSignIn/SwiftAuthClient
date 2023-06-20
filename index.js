const axios = require('axios');
const express = require('express');

require('dotenv').config()

// Set Client to SWIFT server
const client = axios.create({baseURL: process.env.HOST});
const authValue = Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64');
const app = express();

function createSwiftAuthClient() {
  async function generateAuthRequest(req, res) {
    try {
      const authRequest = await client.post(config.swiftAuthUrl, {
        test: "test"
      }, {
        headers: { Authorization: authValue }
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
      const authStatus = await client.get(`${config.swiftPollingUrl}?uniqueId=${uniqueId}`);

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

  async function testConnection() {
    try {
      const test = await client.post('/clients/test', {
        test: "test"
      }, {
        headers: { Authorization: `Basic ${authValue}` }
      });

      console.log(test.data);
    } catch (error) {
      console.error('Error testing connection:', error.response);
    }
  }

  return {
    generateAuthRequest,
    pollForAuthStatus,
    testConnection
  };
}

const swift = createSwiftAuthClient();
swift.testConnection();

module.exports = createSwiftAuthClient;
