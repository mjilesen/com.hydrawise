const axios = require("axios");

axios.interceptors.response.use(null, (error) => {
  return Promise.reject(error);
});

exports.get = axios.get;
