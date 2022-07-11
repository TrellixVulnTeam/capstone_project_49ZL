/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var access_token ="";
var userId = "";

const Post = require('./routes/post.js')
const Recommendations = require('./routes/recommendations.js')
const Statistics = require('./routes/statistics.js')

const Parse = require('parse/node');
// Will later store these as environment variables for much strong security
Parse.initialize("01pRqpOPIL2CPOmyCXOdjQM81JoDXgHXyEYvC8xa", "OBHnma2duz3UjloQLiuD9dIMi4qLKeEMdurNgQ58")
Parse.serverURL = "https://parseapi.back4app.com/"


var client_id = 'dde109facc9446bd95991893064d1a5c'; // Your client id
var client_secret = 'bcdd6a7acf314244abb9063240a8599e'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

// app.use(() => {})
/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser())
   .use(express.json());

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-top-read user-read-recently-played';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        access_token = body.access_token;
        app.set('access_token', access_token)

        // req.session.key = body.access_token
        var refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          userId = body.id
          app.set('userId', body.id)
        });

        res.redirect("http://localhost:3000/home")
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.use('/post', Post)
app.use('/recommendations', Recommendations)
app.use('/statistics', Statistics)

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});


app.post('/search', async (req, res, next) => {
  try {
    const { search } = req.body

    var options = {
      url: `https://api.spotify.com/v1/search?q=${search}&type=track&limit=8`,
      headers: { 'Authorization': 'Bearer ' + access_token},
      json: true
    };

    request.get(options, function(error, response, body) {
      res.status(201).json({body})
    });

  } catch(err) {
    next(err)
  }
})


app.post('/new-comment', async (req, res, next) => {
  try {
    // Adding new comment to Comments database
    const { postId, selectedSongId, comment} = req.body
    const Comments = Parse.Object.extend("Comments");
    const currComment = new Comments();
    currComment.set({
      "comment": comment,
      "selectedSongId": selectedSongId,
    })
    
    // Updating Posts database and appending comment id to commments field
    const Posts = Parse.Object.extend("Posts");
    const query = new Parse.Query(Posts);
    const post = await query.get(postId)

    currComment.set("postId", post)
    const savedComment = await currComment.save()
    
    res.status(200).json(savedComment)
    
  } catch (err) {
    next(err)
  }
}) 


app.post('/', async (req, res, next) => {
  const Login = Parse.Object.extend("Login");
  const loginQuery = new Parse.Query(Login)
  loginQuery.equalTo("userId", userId);
  const checkSong = await loginQuery.find();
  
  if (checkSong.length == 0) {
    const login = new Login();
    login.set("userId", userId)
    const userLogin = await login.save()
    res.status(200).json(userLogin)
  } else {
    res.status(200).json(checkSong[0]);  
  }

})


app.get('/feed', async (req, res, next) => {
  try {
    const Posts = Parse.Object.extend("Posts");
    const query = new Parse.Query(Posts);
    query.descending("createdAt")
    const response = await query.find()
    res.status(200).json(response)
  } catch (err) {
    next(err)
  }
})

app.put('/like', async (req, res, next) => {
  const { postId, userObjectId } = req.body

  const Users = Parse.Object.extend("Login");
  const userQuery = new Parse.Query(Users);
  const user = await userQuery.get(userObjectId);

  const Posts = Parse.Object.extend("Posts");
  const postQuery = new Parse.Query(Posts);
  const post = await postQuery.get(postId)
  post.increment("likes")

  const relation = user.relation("likes")
  relation.add(post)

  const Songs = Parse.Object.extend("Songs");
  const songQuery = new Parse.Query(Songs);
  songQuery.equalTo("selectedSongId", post.get("selectedSongId"))
  const song = await songQuery.find();
  song[0].increment("likes")

  song[0].save()
  user.save()
  post.save()
  res.send({user, post})
})

app.get('/profile', async (req, res, next) => {
  try {
    var options = {
      url: `https://api.spotify.com/v1/me`,
      headers: { 'Authorization': 'Bearer ' + access_token},
      json: true
    };
    request.get(options, function(error, response, body) {
      res.status(200).json({body})
    });
  } catch(err) {
    next(err)
  }
}) 

app.get('/profile/liked/:userObjectId', async (req, res, next) => {
  try {
   
    const userObjectId = req.params.userObjectId;
    
    const Users = Parse.Object.extend("Login");
    const userQuery = new Parse.Query(Users);
    const user = await userQuery.get(userObjectId);
    
    const relation = user.relation("likes")
    const result = await relation.query().find()
    
    res.status(200).json({result})

  } catch(err) {
    next(err)
  }
})

app.get('/profile/posted', async (req, res, next) => {
  try {
    const Posts = Parse.Object.extend("Posts");
    const postQuery = new Parse.Query(Posts);
    console.log(userId)
    postQuery.equalTo("userId", userId);
    const posted = await postQuery.find();
    
    res.status(200).json(posted)

  } catch(err) {
    next(err)
  }
})

app.get('/genre/:artistId', async (req, res, next) => {
  const artistId = req.params.artistId;
  try {
    var options = {
      url: `https://api.spotify.com/v1/artists/${artistId}`,
      headers: { 'Authorization': 'Bearer ' + access_token},
      json: true
    };

    request.get(options, function(error, response, body) {
      res.status(200).json(body.genres)
    });
  } catch (err) {

  }
})



console.log('Listening on 8888');
app.listen(8888);
// module.exports = router;
