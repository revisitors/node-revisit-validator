'use strict';

var request = require('request');
var dataURI = require('data-uri-to-buffer');

var RevisitValidator = function (options) {
  this.url = false;
  this.content = {};
  this.imgBuffer = false;

  if (!options) {
    options = {};
  }

  this.maxSize = parseInt(options.maxSize, 10) || 1000000; // 1 MB

  this.errors = {};

  var self = this;

  var validateSize = function (next) {
    try {
      self.imgBuffer = dataURI(self.content.data);

      if (['image/jpeg', 'image/png', 'image/gif'].indexOf(self.imgBuffer.type) === -1) {
        self.errors.InvalidFileType = 'This can only be a PNG, JPEG or GIF';
        next();
        return;
      }

      if (self.imgBuffer.length > self.maxSize) {
        self.errors.FileTooLarge = 'This image is greater than ' +
          Math.floor(self.maxSize / 1000000) + ' MB';
        next();
        return;
      }
    } catch (e) {
      self.errors.InvalidDataURI = "This image isn't a valid data URI";
      next();
      return;
    }

    next();
  };

  var checkPost = function (next) {
    request({
      method: 'POST',
      json: true,
      url: self.url + '/service',
      body: {
        content: {
          data: self.imgDataURI
        },
        meta: {
          audio: {}
        }
      }
    }, function (err, response, body) {
        if (!body || (body && !body.content)) {
          self.errors.InvalidServicePost = 'Your POST request must point to /service';
          next();
          return;
        }

        self.content = body.content;

        if (!body.meta) {
          self.errors.InvalidServiceMeta = 'You need to carry the `meta` object in the request';
          next();
          return;
        } else if (!body.meta.audio) {
          self.errors.InvalidServiceMetaEmtpy = 'You should not destroy incoming data from `meta`';
          next();
          return;
        }

        validateSize(next);
    });
  };

  var checkHead = function (next) {
    request({
      method: 'HEAD',
      url: self.url,
      followAllRedirects: false,
      timeout: 2000
    }, function (err, response) {
      if (err || !response.statusCode || response.statusCode !== 200) {
        self.errors.InvalidHeadRequest = 'Cannot make a HEAD request to /';
        next();
        return;
      }

      checkPost(next);
    });
  };

  var checkURL = function () {
    if (!self.url) {
      self.errors.InvalidURL = 'URL must not be empty';
    } else if (self.url[self.url.length - 1] === '/') {
      self.errors.InvalidTrailingSlash = 'URL cannot contain a trailing slash';
    }
  };

  this.validate = function (next) {
    this.errors = {};

    checkURL();

    if (!this.errors.InvalidURL && !this.errors.InvalidTrailingSlash) {
      checkHead(next);
      return;
    }

    next();
  };
};

module.exports = RevisitValidator;