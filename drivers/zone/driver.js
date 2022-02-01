const { OAuth2Driver } = require("homey-oauth2app");

class HydrawiseDriver extends OAuth2Driver {
  async onPairListDevices({ oAuth2Client }) {
    console.log(oAuth2Client);
    oAuth2Client.debug("on pair list");
    const data = await oAuth2Client.getZones();
    console.log(data);
    return data;
  }
}

module.exports = HydrawiseDriver;
