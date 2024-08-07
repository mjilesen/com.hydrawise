"use strict";

const Homey = require("homey");
const ZoneHelper = require("./lib/Zone");

const INITIAL_POLLING_INTERVAL = 60; // interval of 60 seconds
const MIN_POLLING_INTERVAL = 60;

class HydrawiseApp extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.syncing = false;
    this.timerId = null;
    this.lastSync = 0;
    this.lastBatchId = 0;

    this.zoneHelper = new ZoneHelper(this.homey);

    this.setInitialPollingSettings();

    //start polling if enabled
    if (this.pollingEnabled) {
      this.startPolling();
    }

    this.homey.settings.on("set", (setting) => {
      if (setting === "pollingEnabled") {
        this.pollingEnabled = this.homey.settings.get("pollingEnabled");

        if (this.pollingEnabled) {
          this.startPolling();
        } else {
          this.stopPolling();
        }
      } else if (setting === "pollingInterval") {
        try {
          this.interval = Number(this.homey.settings.get("pollingInterval"));
        } catch (e) {
          this.interval = INITIAL_POLLING_INTERVAL;
          this.homey.settings.set("pollingInterval", this.interval);
        }
        //re-start polling with the new interval
        if (this.pollingEnabled) {
          this.startPolling();
        }
      }
    });

    // Setup the flow listeners
    this.addPollingSpeedActionListeners();
    this.addPollingActionListeners();
    this.addStartAllZonesActionListeners();
    this.addStopAllZonesActionListeners();
    this.addWateringDurationActionListeners();
  }

  /**
   * Adds a listener for start all zones flowcard actions
   */
  addStartAllZonesActionListeners() {
    this.homey.flow
      .getActionCard("start_all_zones")
      .registerRunListener(async (args) => {
        this.zoneHelper.runAllZones(args);
      });
  }

  /**
   * Adds a listener for stop all zones flowcard actions
   */
  addStopAllZonesActionListeners() {
    this.homey.flow
      .getActionCard("stop_all_zones")
      .registerRunListener(async () => {
        this.zoneHelper.stopAllZones();
      });
  }
  /**
   * Adds a listener for polling speed flowcard actions
   */
  addPollingSpeedActionListeners() {
    this.homey.flow
      .getActionCard("set_polling_speed")
      .registerRunListener(async (args, state) => {
        this.interval = Math.max(args.syncSpeed, MIN_POLLING_INTERVAL );
        this.homey.settings.set("pollingInterval", this.interval.toString());
        this.homey.settings.set("pollingEnabled", true);

        this.startPolling();
      });
  }

  /**
   * Adds a listener for polling mode flowcard actions
   */
  addPollingActionListeners() {
    this.homey.flow
      .getActionCard("set_polling_mode")
      .registerRunListener(async (args, state) => {
        this.pollingEnabled = args.newPollingMode === "on";
        this.homey.settings.set("pollingEnabled", this.pollingEnabled);

        if (args.newPollingMode === "on") {
          return this.startPolling();
        } else if (args.newPollingMode === "once") {
          this.singlePoll();
        } else {
          return this.stopPolling();
        }
      });
  }

  addWateringDurationActionListeners() {
   const wateringDurationActionCard = this.homey.flow.getActionCard('set_watering_duration');
   wateringDurationActionCard.registerRunListener(async (args, state) => {
     const { device } = args;
     console.log( "watering duration", args.wateringDuration.id)
     await device
       .setCapabilityValue( 'watering_duration', args.wateringDuration.id.toString() )
    //   .catch(error => this.logInformation('App.Init WateringDuration', {
    //     message: error.message,
    //     stack: error.stack,
    //   }));
   });
   wateringDurationActionCard.registerArgumentAutocompleteListener(
    'wateringDuration',
    async (query, args) => {
      const results = [{ id:1, name: 1},
        {id:2, name:2},
        {id:3, name: 3},
        {id:4, name: 4},
        {id:5, name: 5},
        {id:6, name: 6},
        {id:7, name: 7},
        {id:8, name: 8},
        {id:9, name: 9},
        {id:10, name: 10},
        {id:11, name: 11},
        {id:12, name: 12},
        {id:13, name: 13},
        {id:14, name: 14},
        {id:15, name: 15},
        {id:16, name: 16},
        {id:17, name: 17},
        {id:18, name: 18},
        {id:19, name: 19},
        {id:20, name: 20},
        {id:25, name: 25},
        {id:30, name: 30},
        {id:35, name: 35},
        {id:40, name: 40},
        {id:45, name: 45},
        {id:50, name: 50},
        {id:60, name: 60},
        {id:70, name: 70},
        {id:80, name: 80},
        {id:90, name: 90}  
      ]
      return results
    },
  );
  }

  setInitialPollingSettings() {
    this.pollingEnabled = this.homey.settings.get("pollingEnabled");
    if (this.pollingEnabled === null) {
      this.pollingEnabled = false;
      this.homey.settings.set("pollingEnabled", this.pollingEnabled);
    }

    if (!this.homey.settings.get("pollingInterval")) {
      this.homey.settings.set("pollingInterval", INITIAL_POLLING_INTERVAL);
    }
    try {
      this.interval = Number(this.homey.settings.get("pollingInterval"));
      if (this.interval < MIN_POLLING_INTERVAL) {
        this.interval = MIN_POLLING_INTERVAL;
        this.homey.settings.set("pollingInterval", this.interval);
      }
    } catch (e) {
      this.interval = INITIAL_POLLING_INTERVAL;
      this.homey.settings.set("pollingInterval", this.interval);
    }
  }

  async startPolling() {
    //make sure any old polling actions are stopped
    this.stopPolling();

    this.timerId = this.homey.setInterval(() => {
      this.updateStatus();
    }, this.interval * 1000);
  }

  async stopPolling() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  async singlePoll() {
    this.updateStatus();
  }

  getAllDevices() {
    const driver = this.homey.drivers.getDriver("zone");
    return driver.getDevices();
  }

  setAllDevicesOnOff(on, duration ) {
    //reset the device onoff status per device
    const devices = this.getAllDevices();
    devices.forEach((device) => {
      device.setZoneOnOff(on, duration );
    });
    //turn polling on (always while something is running)
    if (this.timerId === null && on) {
      this.homey.app.startPolling();
      //turn polling off when devices are turned off and polling is not enabled by default
    } else if (!on && this.timerId != null && !this.homey.app.pollingEnabled) {
      this.stopPolling();
    }
  }
  // update the status for each device
  async updateStatus() {
    try {
      const promises = [];
      const devices = this.getAllDevices();

      //batch to make sure that data from Hydrawise is fetched only once per loop
      this.lastBatchId++;
      if (this.lastBatchId === Number.MAX_VALUE) {
        this.lastBatchId = 1;
      }

      const numDevices = devices ? devices.length : 0;
      for (let i = 0; i < numDevices; i++) {
        const device = devices[i];
        try {
          promises.push(
            this.zoneHelper.updateZoneStatus(device, this.lastBatchId)
          );
        } catch (error) {
          this.log("Sync Devices", error.message);
        }
      }

      // Wait for all the checks to complete
      await Promise.allSettled(promises);
      const runningDevices = devices.filter((device) => {
        return device.getRemainingDuration() != 0;
      });
      //stop polling if all zones are done and polling is not enabled
      if (
        !this.homey.app.pollingEnabled &&
        this.timerId != null &&
        runningDevices.length === 0
      ) {
        this.homey.app.stopPolling();
      }
    } catch (error) {
      this.log(error.message, error.stack);
    }
  }
}

module.exports = HydrawiseApp;
