const http = require("./httpService");
const { SimpleClass } = require("homey");
const _ = require("lodash");

const STATUS_ZONE_URL = "statusschedule.php";
const SET_ZONE_URL = "setzone.php";

const DEFAULT_DURATION = 5; //minutes

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
    const url = this.getUrl(STATUS_ZONE_URL);
    const params = this.getParameters("");

    const data = await this.doRequest(url, params);
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

  async runAllZones(options) {
    const url = this.getUrl(SET_ZONE_URL);
    const duration = options.duration * 60; // convert to seconds
    const action = "runall";
    //create the specific parameter part of the url
    const params = this.getParameters({
      params: {
        action: action,
        period_id: 999,
        custom: duration,
      },
    });
    try {
      await this.doRequest(url, params);
      this.homey.app.setAllDevicesOnOff(true, duration );
    } catch (ex) {
      this.log(ex);
    }
  }

  async stopAllZones() {
    const url = this.getUrl(SET_ZONE_URL);
    const action = "stopall";
    //create the specific parameter part of the url
    const params = this.getParameters({
      params: { action: action },
    });
    try {
      await this.doRequest(url, params);
      //reset the device onoff property to off
      this.homey.app.setAllDevicesOnOff(false, 0 );
    } catch (ex) {
      this.log(ex);
    }
  }

  async startstopZone(onoff, options, device) {
    const url = this.getUrl(SET_ZONE_URL);
    //convert duration to minutes -> here we get them as seconds
    options.duration = options.duration / 1000;
    const duration = this.getDuration(options, device);

    const relayId = device.getData("id").id;
    const action = onoff ? "run" : "stop";

    //create the specific parameter part of the url
    const params = this.getParameters({
      params: {
        action: action,
        period_id: 999,
        relay_id: relayId,
        custom: duration,
      },
    });
    try {
      await this.doRequest(url, params);
      device.updateRemainingDuration( onoff, duration );
      device.updateRunning( onoff );

      //start polling if not already started (stopping will done in the status update when polling)
      if (this.homey.app.timerId === null && action === "run") {
        this.homey.app.startPolling();
      }
    } catch (ex) {
      if (device) {
        device.setUnavailable(ex);
      } else {
        this.log(ex);
      }
    }
  }

  async updateZoneStatus(device, batchID) {
    const url = this.getUrl(STATUS_ZONE_URL);
    const params = this.getParameters("");

    try {
      if (batchID != this.lastBatchID) {
        this.data = await this.doRequest(url, params);
        this.lastBatchID = batchID;
      }
      const selectedRelay = Object.values(this.data.relays).find(
        (relay) => relay.relay_id === device.getData().id
      );

      device.updateStatus(selectedRelay);
    } catch (ex) {
      sure;

      if (device) {
        device.setUnavailable(ex);
      } else {
        this.log(ex);
      }
    }
  }

  async doRequest(url, params) {
    //execute the request
    try {
      const { data } = await http.get(url, params);
      //status 200 but Homey didn't manage to start/stop
      if (data && data.message_type === "error") {
        throw new Error(data.message);
      }
      return data;
    } catch (ex) {
      return Promise.reject(new Error(ex));
    }
  }

  getUrl(suburl) {
    return "http://api.hydrawise.com/api/v1/" + suburl;
  }

  getParameters(addOnParams) {
    const apiKey = this.homey.settings.get("api_key");
    const apiParam = { params: { api_key: apiKey } };

    return _.merge(apiParam, addOnParams);
  }

  getDuration(options, device) {
    //duration always in minutes -> need to convert to seconds
    let duration = DEFAULT_DURATION;
    if (typeof options.duration === "number ") {
      duration = options.duration;
    } else if (device) {
      duration = device.getSetting("duration");
    }
    return duration * 60;
  }
};
