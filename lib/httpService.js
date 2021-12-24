const axios = require("axios");

axios.interceptors.response.use(null, (error) => {
  /*const expectedError =
    error.response &&
    error.response.status >= 400 &&
    error.response.status < 500;

  if (!expectedError) {
    //  toast.info("An unexpected error occured.");
    //    logger.log(error);
    //    toast.error("An unexpected error occured.");
  }*/
  return Promise.reject(error);
});

exports.get = axios.get;
