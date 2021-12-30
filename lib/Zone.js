const http = require("./httpService");

async function getZones(homey) {
  const zones = [];
  const url = getUrl(homey);

  try {
    const { data } = await http.get(url);
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
    let errortext = homey.__("unexpectedError");
    //show the message to the user (if any....)
    if (ex.response && ex.response.status !== 200) {
      errortext = homey.__("RESTError", {
        status: ex.response.status,
        message: ex.response.data,
      });
    }
    return Promise.reject(new Error(errortext));
  }
}

async function startstopZone(onoff, options, defaultDuration) {
  const duration =
    typeof options.duration === "number" ? options.duration : defaultDuration;

  console.log("Start/Stop zone", onoff, duration);
}

async function getZoneStatus(instance, relayID) {
  const url = getUrl(instance.homey);
  try {
    const { data } = await http.get(url);
    const selectedRelay = Object.values(data.relays).find(
      (relay) => relay.relay_id === relayID
    );
    const runLength = selectedRelay.run / 60;

    instance.setCapabilityValue(
      "meter_remaining_duration",
      Math.round(runLength)
    );
    console.log("update zone status");
  } catch (ex) {
    return Promise.reject(new Error(ex));
  }
}

function getUrl(homey) {
  const apiKey = homey.settings.get("api_key");

  const apiEndpoint = "http://api.hydrawise.com/api/v1/";
  return apiEndpoint + "statusschedule.php?api_key=" + apiKey;
}

exports.getZones = getZones;
exports.startstopZone = startstopZone;
exports.getZoneStatus = getZoneStatus;
