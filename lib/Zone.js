const http = require("./httpService");

async function getZones(instance) {
  const zones = [];
  const apiKey = instance.settings.get("api_key", this);
  const apiEndpoint = instance.settings.get("api_url", this);

  const url = apiEndpoint + "statusschedule.php?api_key=" + apiKey;
  try {
    const { data } = await http.get(url);
    //convert JSON to Array
    Object.values(data.relays).map(function (relay) {
      zones.push({ name: relay.name, data: { id: relay.relay_id } });
    });
    return zones;
  } catch (ex) {
    let errortext = instance.__("unexpectedError");
    //show the message to the user (if any....)
    if (ex.response && ex.response.status !== 200) {
      errortext = instance.__("RESTError", {
        status: ex.response.status,
        message: ex.response.data,
      });
    }
    return Promise.reject(new Error(errortext));
  }
}

exports.getZones = getZones;
