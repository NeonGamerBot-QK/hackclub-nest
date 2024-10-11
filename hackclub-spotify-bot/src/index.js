require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { WebClient } = require('@slack/web-api');
const { Client } = require('@slack/oauth');
const { getLoginUrl, refreshToken } = require('./spotify');
const path = require('path');

const app = express();
// Initialize
const web = new WebClient(process.env.SLACK_TOKEN);
const oauth = new Client({
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  state: Math.random().toString(36).substring(2),
});
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', 'src/views');
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret:  Math.random().toString(36).substring(2),
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}));

app.get('/', (req, res) => {
res.render('index', { title: 'Hack Club Spotify Bot', description: "Contribute to the hackclub spotify playlist!" });
});
app.get('/login', async (req, res) => {
    if(req.session.token) {

    }
})

app.listen(process.env.PORT || 3000, () => {
  console.log('Example app listening on port 3000!');
});