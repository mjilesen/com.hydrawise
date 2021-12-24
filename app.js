"use strict";

const Homey = require("homey");

class MyApp extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log("MyApp has been initialized");

    const card = this.homey.flow.getActionCard("start-zone");
    card.registerRunListener(async (args) => {
      //log someting
      const { Time } = args;
      this.log("start zone");
    });
  }
}

module.exports = MyApp;
