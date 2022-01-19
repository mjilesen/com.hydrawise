const Homey = require("homey");
const ZoneHelper = require("../../lib/Zone");

class Driver extends Homey.Driver {

  async onPairListDevices() {
    this.zoneHelper = new ZoneHelper(this.homey);
    return await this.zoneHelper.getZones();
  }
}

module.exports = Driver;
