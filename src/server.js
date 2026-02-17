
require('dotenv').config();

const express = require('express');


const app = require('./app');

const PORT = process.env.PORT || 4001;

app.listen(PORT, () => {
  console.log(`Auth Service running on ${PORT}`);
});
