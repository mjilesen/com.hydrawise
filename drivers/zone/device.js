"use strict";

const { Device } = require("homey");
const { startstopZone, getZoneStatus } = require("../../lib/Zone");

class HydraWiseDevice extends Device {
  /**
   * onInit is called when the device is initialized.
   */

  async onInit() {
    const pollingEnabled = this.homey.settings.get("pollingEnabled");

    if (pollingEnabled) {
      const pollingFrequency =
        this.homey.settings.get("pollingFrequency") * 1000;
      var intervalId = this.homey.setInterval(() => {
        getZoneStatus(this, this.getData().id);
      }, pollingFrequency);
      //this.homey.settings.set("intervalID", intervalId);
    }

    this.registerCapabilityListener("onoff", async (value, options) => {
      await startstopZone(value, options, this.getSetting("duration"));
    });
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    // this.log('MyDevice has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    //  this.log('MyDevice settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    //this.log('MyDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    //const intervalId = this.homey.settings.get("intervalID");
    //if (intervalId) {
    this.homey.clearInterval(intervalId);
    //}
    this.log("MyDevice has been deleted");
  }
}

module.exports = HydraWiseDevice;
