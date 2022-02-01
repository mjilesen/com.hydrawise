const {
  fetch,
  OAuth2Client,
  OAuth2Error,
  OAuth2Token,
} = require("homey-oauth2app");
const { URLSearchParams } = require("url");

module.exports = class HydrawiseOAuth2Client extends OAuth2Client {
  static API_URL = "http://api.hydrawise.com/api/v1/";
  static TOKEN_URL = "https://app.hydrawise.com/api/v2/oauth/access-token";
  static AUTHORIZATION_URL = "https://app.hydrawise.com/config/login";
  static SCOPES = ["all"];

  // Optional:
  //static TOKEN = MyBrandOAuth2Token; // Default: OAuth2Token
  //static REDIRECT_URL = "https://callback.athom.com/oauth2/callback"; // Default: 'https://callback.athom.com/oauth2/callback'

  // Overload what needs to be overloaded here

  async onHandleNotOK({ body }) {
    throw new OAuth2Error(body.error);
  }

  async onGetTokenByCredentials({ code }) {
    const userName = this.homey.settings.get("userName");
    const password = this.homey.settings.get("password");

    const params = new URLSearchParams();
    params.append("grant_type", "password");
    params.append("username", userName);
    params.append("password", password);
    params.append("redirect_uri", "https://callback.athom.com/oauth2/callback"); // the trailing slash does not work anymore and returns a code 500!

    // Exchange code for token
    const res = await fetch(this._tokenUrl, {
      method: "POST",
      body: params,
    });
    const body = await res.json();
    this.log("Body", body);
    return new OAuth2Token(body);
  }

  async getZones() {
    this.log("get zones");
    const zones = [];

    const data = await this.get({ path: "statusschedule.php" });
    this.log(data);
    //convert JSON to Array
    Object.values(data.relays).map(function (relay) {
      zones.push({
        name: relay.name,
        data: { id: relay.relay_id },
        settings: { duration: 15 },
      });
    });
    return zones;
  }

  async getThings({ color }) {
    return this.get({
      path: "/things",
      query: { color },
    });
  }

  async updateThing({ id, thing }) {
    return this.put({
      path: `/thing/${id}`,
      json: { thing },
    });
  }
};
