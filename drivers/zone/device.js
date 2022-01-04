"use strict";

const { Device } = require("homey");
const ZoneHelper = require("../../lib/Zone");

class HydraWiseDevice extends Device {
  /**
   * onInit is called when the device is initialized.
   */

  async onInit() {
    this.zoneHelper = new ZoneHelper(this.homey);
    this.registerCapabilityListener("onoff", async (value, options) => {
      await this.zoneHelper.startstopZone(value, options, this);
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
    this.log("HydrawiseDevice has been deleted");
  }

  // Update the capabilities
  async updateStatus(updatedRelay) {
    console.log("update status", updatedRelay.run);
    const runLength = updatedRelay.run / 60;
    this.setCapabilityValue("meter_remaining_duration", Math.round(runLength));
  }

  async startZone() {
    console.log("Start zone ");
  }
}

module.exports = HydraWiseDevice;
