const express = require('express')
const router = express.Router()
var request = require('request');

// const {key} = require('authentication')

const Parse = require('parse/node');
// Will later store these as environment variables for much strong security
// Parse.initialize("01pRqpOPIL2CPOmyCXOdjQM81JoDXgHXyEYvC8xa", "OBHnma2duz3UjloQLiuD9dIMi4qLKeEMdurNgQ58")
Parse.initialize("jf8fBQCKtSE8fxxzMlARZZYxGgbMwLA2l9tAfwSU", "z25hAbCBiOVPkYzHIJt8PXLjZxKTDhsuvhMaVtuM")
Parse.serverURL = "https://parseapi.back4app.com/"

/**
 * STRETCH GOALS: implement some type of scaling based on time/lambda factor where most recent posts 
 * have greater weight
 */

// GET: most liked cumulative song
router.get("/most-liked", async (req, res, next) => {
    try {
        const Songs = Parse.Object.extend("Songs");
        const query = new Parse.Query(Songs)
        const result = await query.find()
        let max = -1;
        let maxId = "";
        result.map((currSong) => {
            if (currSong.get("likes").length > max) {
                max = currSong.get("likes").length;
                maxId = currSong.get("selectedSongId");
            }
        })
        var options = {
            url: `https://api.spotify.com/v1/tracks/${maxId}`,
            headers: { 'Authorization': 'Bearer ' + req.app.get('access_token')},
            json: true
          };
      
        request.get(options, function(error, response, body) {
            res.status(200).json({body})
        });
    } catch (err) {
        next(err)
    }
})


// GET: most commented on song
router.get("/most-commented", async (req, res, next) => {
    try {
        const Songs = Parse.Object.extend("Songs");
        const query = new Parse.Query(Songs)
        const result = await query.find()
        let max = -1;
        let maxId = "";
        result.map((currSong) => {
            if (currSong.get("comments").length > max) {
                max = currSong.get("comments").length;
                maxId = currSong.get("selectedSongId");
            }
        })
        var options = {
            url: `https://api.spotify.com/v1/tracks/${maxId}`,
            headers: { 'Authorization': 'Bearer ' + req.app.get('access_token')},
            json: true
          };
      
        request.get(options, function(error, response, body) {
            res.status(200).json({body})
        });
    } catch (err) {
        next(err)
    }
})

// GET: highest rated song on average
router.get("/highest-rated", async (req, res, next) => {
    try {
        const Songs = Parse.Object.extend("Songs");
        const query = new Parse.Query(Songs)
        query.descending("avgRating")
        query.limit(1)
        const result = await query.find()
        
        var options = {
            url: `https://api.spotify.com/v1/tracks/${result[0].get("selectedSongId")}`,
            headers: { 'Authorization': 'Bearer ' + req.app.get('access_token')},
            json: true
          };
      
        request.get(options, function(error, response, body) {
            res.status(200).json({body})
        });
    } catch (err) {
        next(err)
    }
})

module.exports = router;