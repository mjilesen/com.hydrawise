"use strict";

const { Device } = require("homey");
const ZoneHelper = require("../../lib/Zone");
const Conversions = require( '../../lib/Conversions' );

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
    const running = updatedRelay.time === 1
    const runLength = running ? updatedRelay.run / 60 : 0;
    //this.isChangedByStatusUpdate = true;
    this.setCapabilityValue("meter_remaining_duration", Math.ceil(runLength));
    this.setCapabilityValue( "meter_time_next_run_duration", running ? 0 : updatedRelay.run / 60 );
    this.updateRunning( running );

    const nextrunttime = Conversions.toDaysMinutes( updatedRelay.time )
    this.setCapabilityValue("meter_time_next_run", nextrunttime );
  }

  getRemainingDuration() {
    return this.getCapabilityValue("meter_remaining_duration");
  }

  setZoneOnOff(on, duration ) {
    this.setCapabilityValue("onoff", on);
    this.updateRemainingDuration( on, duration );
  }

  updateRemainingDuration( on, duration ){
    const newDuration = on?Math.round( duration/60 ): 0;
    this.setCapabilityValue("meter_remaining_duration", newDuration ) ;
  }

  updateRunning( on ){
    this.setCapabilityValue("is_running", on ) ;
    this.setCapabilityValue("onoff", on );
  }
}

module.exports = HydraWiseDevice;
