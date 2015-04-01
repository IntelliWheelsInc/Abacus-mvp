/* globals $ */
'use strict';

/*
  *** dbLoader.js ***
  This file loads the json database from app/data.
  It should be replaced with loading the actual data from the actual database as we move forward.
*/

//get frame data
var frameDataFromDB;
$.getJSON('data/frameData.json')
  .done(function( json ) {
    frameDataFromDB = json;
  })
  .fail(function( jqxhr, textStatus, error ) {
    var err = textStatus + ', ' + error;
    console.log( 'Request Failed: ' + err );
  });

//get cart data
var cartDataFromDB;
$.getJSON('data/cartData.json')
  .done(function( json ) {
    cartDataFromDB = json;
  })
  .fail(function( jqxhr, textStatus, error ) {
    var err = textStatus + ', ' + error;
    console.log( 'Request Failed: ' + err );
  });
