const path = require("path");
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const { InstallProvider, FileInstallationStore } = require("@slack/oauth");
const {
  getLoginUrl,
  refreshToken,
  getCredentials,
  saveCredentials,
  spotifyRoutes,
  addSongToPlaylist,
} = require("./spotify");
const { QuickDB } = require("quick.db");

const db = new QuickDB({
  filePath: "./data/songs.sqlite",
});
let cacheDb = {};
const app = express();
const userScopes = ["identity.avatar", "identity.basic", "identity.team"];
// Initialize
const oauth = new InstallProvider({
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.STATE_SECRET,
  stateVerification: false,
  stateStore: new FileInstallationStore(
    path.join(__dirname, "../data/states.json"),
  ),
  installationStore: new FileInstallationStore(
    path.join(__dirname, "../data/installations.json"),
  ),
  //   installationStore: {

  //}
  stateStore: {
    generateStateParam: (installUrlOptions, date) => {
      // generate a random string to use as state in the URL
      const randomState =
        process.env.STATE_SECRET + Math.random().toString(36).substring(7);
      // save installOptions to cache/db
      cacheDb[randomState] = installUrlOptions;
      // myDB.set(randomState, installUrlOptions);
      // return a state string that references saved options in DB
      return randomState;
    },
    // verifyStateParam's first argument is a date object and the second argument is a string representing the state
    // verifyStateParam is expected to return an object representing installUrlOptions
    verifyStateParam: (date, state) => {
      return cacheDb[state];
      // fetch saved installOptions from DB using state reference
      const installUrlOptions = myDB.get(randomState);
      return installUrlOptions;
    },
  },
});
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", "src/views");
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.STATE_SECRET,
    resave: true,
    store: new FileStore({
      path: path.join(__dirname, "../data/sessions"),
    }),
    saveUninitialized: true,
    cookie: { secure: "auto", maxAge: 1000 * 60 * 60 * 24 * 365 },
  }),
);

try {
  const statusMonitor = require("express-status-monitor")({
    healthChecks: [
      {
        protocol: "http",
        host: "localhost",
        port: 3000,
        path: "/",
        timeout: 1000,
        interval: 1000,
      },
    ],
  });
  app.use(statusMonitor);
  app.use((req, res, next) => {
    // console.debug([req.headers, req.session])
    next();
  });
} catch (e) {
  // we can ignore since this is an optional dependency
}

app.get("/login", async (req, res) => {
  if (req.session.token) {
    res.redirect("/home");
  } else {
    res.redirect(
      await oauth.generateInstallUrl({
        // Add the scopes your app needs
        redirectUri: process.env.SLACK_REDIRECT_URI,
        scopes: [],

        userScopes: userScopes,
      }),
    );
  }
});
app.get("/slack/callback", (req, res) => {
  // console.debug(req.headers, req.url)
  oauth.handleCallback(req, res, {
    success: async (install) => {
      // typings
      // user: { token:string , scopes: string[], id: string}
      // console.log(install)
      req.session.info = install;
      req.session.token = install.user.token;
      res.redirect("/home");
    },
    failure: (err) => {
      console.log(err);
      res.send(
        "Failed to install!, please contact neon in the slack!, \n" + err.stack,
      );
    },
  });
});
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});
app.get("/", (req, res) => {
  res.render("index", {
    title: "Hack Club Spotify Bot",
    description: "Contribute to the hackclub spotify playlist!",
  });
});
const errorStrings = [
  "Invalid CSRF Token!", // token = csrf token
  "Song is not a track! (or not even a spotify song url)",
  "Song already exists in the database! (its in the playlist or banned from the playlist)",
];
app.get("/home", async (req, res) => {
  if (!req.session.info) return res.redirect("/login");
  let onetimetoken = Math.random().toString(36).substring(7);
  cacheDb[onetimetoken] = true;
  res.render("home", {
    title: "Hack Club Spotify Bot",
    description: "Contribute to the hackclub spotify playlist!",
    userinfo: req.session.info,
    onetimetoken,
    error: errorStrings[req.query.error],
    s: req.query.s,
  });
});
app.post("/spotify/submitsong", async (req, res) => {
  if (!req.session.token) return res.redirect("/login");
  if (!cacheDb[req.query.token]) return res.redirect(`/home?error=0`);
  delete cacheDb[req.query.token];

  const songurl = req.body.songurl;

  const songuriinfo = require("spotify-uri").parse(songurl);
  if (songuriinfo.type !== "track") return res.redirect(`/home?error=1`);
  const alreadyExists = await db.has(songuriinfo.id);
  if (alreadyExists) return res.redirect(`/home?error=2`);
  const formattedURI = require("spotify-uri").formatURI(songuriinfo);
  await db.set(songuriinfo.id, {
    song_url: songurl,
    added_by: req.session.info.user.id,
    added_at: Date.now(),
  });
  addSongToPlaylist(formattedURI);
  fetch("https://slack.mybot.saahild.com/send-private", {
    method: "POST",
    body: JSON.stringify({
      channel: "C07RE4N7S4B",
      text: `:new_spotify: New Song: ${songurl} - added by <@${req.session.info.user.id}>`,
    }),
    headers: {
      Authorization: process.env.AUTH_FOR_ZEON,
      "Content-Type": "application/json",
    },
  })
    .then((r) => r.json())
    .then((d) => {
      fetch("https://slack.mybot.saahild.com/send-private", {
        method: "POST",
        body: JSON.stringify({
          channel: "C07RE4N7S4B",
          thread_ts: d.ts,
          text: `:thread: Responses about new song here please!`,
        }),
        headers: {
          Authorization: process.env.AUTH_FOR_ZEON,
          "Content-Type": "application/json",
        },
      });
    });
  if (!process.env.TESTING) {
    fetch("https://slack.mybot.saahild.com/send-private", {
      method: "POST",
      body: JSON.stringify({
        channel: "C07RE4N7S4B",
        text: `<!subteam^S07RGTY93J8>`,
      }),
      headers: {
        Authorization: process.env.AUTH_FOR_ZEON,
        "Content-Type": "application/json",
      },
    });
  }
  res.redirect("/home?s=1");
});
app.get("/spotify/link", async (req, res) => {
  if (!req.session.info) return res.redirect("/login");
  if (req.session.info.user.id !== "U07L45W79E1")
    return res.status(401).end("unauthorized");
  res.redirect(getLoginUrl());
});

spotifyRoutes(app);

app.listen(process.env.PORT || 3000, async () => {
  console.log("Example app listening on port 3000!");
  // if(!await db.has())
  if (getCredentials() !== null) refreshToken(getCredentials().refresh_token);
});
