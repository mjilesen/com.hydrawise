const Homey = require("homey");
const { getZones } = require("../../lib/Zone");

class Driver extends Homey.Driver {
  async onPairListDevices() {
    return await getZones(this.homey);
  }
}

module.exports = Driver;
