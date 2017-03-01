"use strict";

var Gpio = require('../onoff').Gpio,
  assert = require('assert'),
  button = new Gpio(4, 'in', 'both');

assert(button.direction() === 'in');
assert(button.edge() === 'both');

console.info('Please press button attached to GPIO #4...');

button.watch(function (err, value) {
  if (err) {
    throw err;
  }

  assert(value === 0 || value === 1);

  button.unexport();

  console.log('ok - ' + __filename);
  console.log('     button pressed, value was ' + value);
});

