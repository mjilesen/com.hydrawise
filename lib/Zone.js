const http = require("./httpService");
const { SimpleClass } = require("homey");

module.exports = class ZoneHelper extends SimpleClass {
  constructor(Homey) {
    super();
    this.homey = Homey;
    this.lastBatchID = 0;
    this.data;
    return this;
  }

  async getZones() {
    const zones = [];
    const url = this.getUrl("statusschedule.php");
    const params = this.getParameters("");

    try {
      const { data } = await http.get(url, params);
      //convert JSON to Array
      Object.values(data.relays).map(function (relay) {
        zones.push({
          name: relay.name,
          data: { id: relay.relay_id },
          settings: { duration: 15 },
        });
      });
      return zones;
    } catch (ex) {
      let errortext = this.homey.__("unexpectedError");
      //show the message to the user (if any....)
      if (ex.response && ex.response.status !== 200) {
        errortext = this.homey.__("RESTError", {
          status: ex.response.status,
          message: ex.response.data,
        });
      }
      return Promise.reject(new Error(errortext));
    }
  }

  async startstopZone(onoff, options, device) {
    console.log(options);
    //convert all to seconds
    const duration =
      typeof options.duration === "number"
        ? options.duration / 1000
        : device.getSetting("duration") * 60;

    console.log("Start/Stop zone", onoff, duration);
  }

  async updateZoneStatus(device, batchID) {
    const url = this.getUrl("statusschedule.php");
    const params = this.getParameters("");

    try {
      if (batchID != this.lastBatchID) {
        const { data } = await http.get(url, params);
        this.data = data;
        this.lastBatchID = batchID;
      }
      const selectedRelay = Object.values(this.data.relays).find(
        (relay) => relay.relay_id === device.getData().id
      );
      device.updateStatus(selectedRelay);
    } catch (ex) {
      return Promise.reject(new Error(ex));
    }
  }

  getUrl(suburl) {
    return "http://api.hydrawise.com/api/v1/" + suburl;
  }
  getParameters(addOnParams) {
    const apiKey = this.homey.settings.get("api_key");
    return { params: { api_key: apiKey + addOnParams } };
  }
};
