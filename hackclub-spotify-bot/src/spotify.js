
let token = null;
let authStuff = null;
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;
async function fetchWebApi(endpoint, method, body) {
    const res = await fetch(`https://api.spotify.com/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      method,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    // console.debug(text)
    // abs nothing is wrong
    return JSON.parse(text.trim());
  }

  function getLoginUrl() {
    const state = generateRandomString(16);
    const scope = [
      "ugc-image-upload",
      "user-read-playback-state",
      "user-modify-playback-state",
      "user-read-currently-playing",
      "app-remote-control",
      "streaming",
      "playlist-read-private",
      "playlist-read-collaborative",
      "playlist-modify-private",
      "playlist-modify-public",
      "user-follow-modify",
      "user-follow-read",
      "user-read-playback-position",
      "user-top-read",
      "user-read-recently-played",
      "user-library-modify",
      "user-library-read",
      "user-read-email",
      "user-read-private",
    ].join(" ");
  
    return (
      "https://accounts.spotify.com/authorize?" +
    `response_type=code&grant_type=client_credentials&client_id=${client_id}&scope=${scope}&redirect_uri=${redirect_uri}&state=${state}`
    );
  }

  function generateRandomString(length) {
    let result = "";
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  }
  async function refreshToken(refresh_token) {
    try {
      // var refresh_token = req.query.refresh_token;
      const authOptions = {
        url: "https://accounts.spotify.com/api/token",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            new Buffer.from(client_id + ":" + client_secret).toString("base64"),
        },
        form: {
          grant_type: "refresh_token",
          refresh_token: refresh_token,
        },
        json: true,
      };
      console.log(authOptions);
      const formdm = new URLSearchParams();
  
      formdm.append("grant_type", "refresh_token");
      formdm.append("refresh_token", refresh_token);
  
      fetch(authOptions.url, {
        body: formdm,
        headers: authOptions.headers,
        method: "POST",
      })
        .then(async (r) => {
          const text = await r.text();
          console.log(text);
          return JSON.parse(text);
        })
        .then((auth) => {
          if (!auth.refresh_token) auth.refresh_token = refresh_token;
          console.log(auth);
          authStuff = auth;
          token = auth.access_token;
          if (auth.expires_in) {
            setTimeout(() => {
              refreshToken(auth.refresh_token);
            }, auth.expires_in * 1000);
          }
        });
    } catch (e) {
      console.error(`Welp it broke`);
      // try again asap because we NEED THAT TOKEN
      refreshToken(refresh_token);
    }
  }
  