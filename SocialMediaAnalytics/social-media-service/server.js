// average-calculator-microservice.js
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 9876;



// Start the server
app.listen(PORT, () => {
  console.log(`Average Calculator Microservice running on port ${PORT}`);
});