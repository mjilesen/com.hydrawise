"use strict";

const Homey = require("homey");
const ZoneHelper = require("./lib/Zone");

const INITIAL_POLLING_INTERVAL = 60; // interval of 60 seconds
const MIN_POLLING_INTERVAL = 30;

class MyApp extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.syncing = false;
    this.timerId = null;
    this.commandsQueued = 0;
    this.lastSync = 0;
    this.lastBatchId = 0;

    this.zoneHelper = new ZoneHelper(this.homey);

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

    if (this.pollingEnabled) {
      this.startSync();
    }

    this.homey.settings.on("set", (setting) => {
      if (setting === "pollingEnabled") {
        this.pollingEnabled = this.homey.settings.get("pollingEnabled");

        console.log("Polling option changed to: ", this.pollingEnabled);

        if (this.pollingEnabled) {
          this.startSync();
        } else if (this.commandsQueued === 0) {
          this.stopSync();
        }
      } else if (setting === "pollingInterval") {
        try {
          this.interval = Number(this.homey.settings.get("pollingInterval"));
        } catch (e) {
          this.interval = INITIAL_POLLING_INTERVAL;
          this.homey.settings.set("pollingInterval", this.interval);
        }

        this.startSync();
      }
    });

    // Setup the flow listeners
    this.addPollingSpeedActionListeners();
    this.addPollingActionListeners();
    this.addStartAllZonesActionListeners();
    this.addStopAllZonesActionListeners();
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
        this.interval = Math.max(args.syncSpeed, 30);
        this.homey.settings.set("pollingInterval", this.interval.toString());
        this.homey.settings.set("pollingEnabled", true);

        if (this.commandsQueued > 0) {
          // Sync is currently boosted so don't make any changes now
          return;
        }

        this.startSync();
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
          this.startSync();
        } else if (args.newPollingMode === "once") {
          this.nextInterval = 0;

          if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
          }

          if (!this.syncing) {
            this.timerId = this.homey.setTimeout(() => this.syncLoop(), 3000);
          }
        } else {
          return this.stopSync();
        }
        return true;
      });
  }

  async stopSync() {
    this.pollingEnabled = false;

    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;

      this.log("Stop sync requested");
    }
  }

  async startSync() {
    this.nextInterval = 0;

    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    this.pollingEnabled = this.homey.settings.get("pollingEnabled");
    if (this.pollingEnabled) {
      this.log("Start polling requested");

      let interval = 0.1;

      // make sure the new sync is at least 30 second after the last one
      let minSeconds = (30000 - (Date.now() - this.lastSync)) / 1000;
      if (minSeconds > 0) {
        if (minSeconds > 30) {
          minSeconds = 30;
        }
        interval = minSeconds;
      }

      this.log("Restart sync in: ", interval);
      this.nextInterval = this.interval * 1000;
      if (!this.syncing) {
        this.timerId = this.homey.setTimeout(
          () => this.syncLoop(),
          interval * 1000
        );
      }
    }
  }

  // The main polling loop that updates the status of the zones
  async syncLoop() {
    if (!this.syncing) {
      this.syncing = true;

      if (this.timerId) {
        // make sure any existing timer is canceled
        clearTimeout(this.timerId);
        this.timerId = null;
      }

      if (Date.now() - this.lastSync > 28000) {
        this.lastSync = Date.now();

        try {
          await this.updateStatus();
        } catch (error) {
          this.log("syncLoop", error.message);
        }
      } else {
        this.log("Skipping sync: too soon");
      }

      if (this.nextInterval > 0) {
        // Setup timer for next sync
        this.timerId = this.homey.setTimeout(
          () => this.syncLoop(),
          this.nextInterval
        );
      } else {
        this.log("Not renewing sync");
      }

      // Signal that the sync has completed
      this.syncing = false;
    } else {
      this.log("Skipping sync: Previous sync active");
    }
  }

  varToString(source) {
    try {
      if (source === null) {
        return "null";
      }
      if (source === undefined) {
        return "undefined";
      }
      if (source instanceof Error) {
        const stack = source.stack.replace("/\\n/g", "\n");
        return `${source.message}\n${stack}`;
      }
      if (typeof source === "object") {
        const getCircularReplacer = () => {
          const seen = new WeakSet();
          return (key, value) => {
            if (typeof value === "object" && value !== null) {
              if (seen.has(value)) {
                return "";
              }
              seen.add(value);
            }
            return value;
          };
        };

        return JSON.stringify(source, getCircularReplacer(), 2);
      }
      if (typeof source === "string") {
        return source;
      }
    } catch (err) {
      this.homey.app.updateLog(`VarToString Error: ${err}`, 0);
    }

    return source.toString();
  }

  // update the status for each device
  async updateStatus() {
    try {
      const promises = [];

      const drivers = this.homey.drivers.getDrivers();
      //batch to make sure that data from Hydrawise is fetched only once per loop
      this.lastBatchId++;
      if (this.lastBatchId === Number.MAX_VALUE) {
        this.lastBatchId = 1;
      }
      for (const driver in drivers) {
        if (Object.prototype.hasOwnProperty.call(drivers, driver)) {
          const devices = this.homey.drivers.getDriver(driver).getDevices();
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
        }
      }

      // Wait for all the checks to complete
      await Promise.allSettled(promises);
    } catch (error) {
      this.log(error.message, error.stack);
    }
  }
}

module.exports = MyApp;
