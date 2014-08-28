'use strict';

process.env.NODE_ENV = 'test';

var should = require('should');
var nock = require('nock');

var RevisitValidator = require('../index');
var rv = new RevisitValidator({
  maxSize: 100
});

var url = 'http://test.com';
var content = {
  content: {
    data: ''
  }
};

var scope;
var scopePost;

var headReq = function () {
  scope = nock(url)
    .head('/')
    .reply(200, 'Found');
};

var postReq = function () {
  scopePost = nock(url)
      .post('/service')
      .reply(200, content);
};

describe('validate', function () {
  it('should return with an invalid empty URL', function (done) {
    rv.validate(function () {
      should.exist(rv.errors.InvalidURL);
      done();
    });
  });

  it('should return with an invalid URL containing a trailing slash', function (done) {
    rv.url = url + '/';

    rv.validate(function () {
      should.exist(rv.errors.InvalidTrailingSlash);
      done();
    });
  });

  it('should return with an unsuccessful HEAD request at /', function (done) {
    rv.url = url;

    scope = nock(url)
      .head('/')
      .reply(404, "Not found");

    rv.validate(function () {
      should.exist(rv.errors.InvalidHeadRequest);
      done();
    });
  });

  it('should return with a successful HEAD request at /', function (done) {
    headReq();
    postReq();

    rv.validate(function () {
      should.not.exist(rv.errors.InvalidHeadRequest);
      done();
    });
  });

  it('should return with an invalid POST request at /service', function (done) {
    headReq();

    scope = nock(url)
      .post('/service')
      .reply(404, 'Not Found');

    rv.validate(function () {
      should.exist(rv.errors.InvalidServicePost);
      done();
    });
  });

  it('should return with a valid POST request at /service', function (done) {
    headReq();
    postReq();

    rv.validate(function () {
      should.not.exist(rv.errors.InvalidServicePost);
      done();
    });
  });

  it('should return with an invalid meta object', function (done) {
    headReq();
    postReq();

    rv.validate(function () {
      should.exist(rv.errors.InvalidServiceMeta);
      done();
    });
  });

  it('should return with a valid meta object', function (done) {
    content.meta = {
      audio: {}
    };

    headReq();
    postReq();

    rv.validate(function () {
      should.not.exist(rv.errors.InvalidServiceMeta);
      done();
    });
  });

  it('should return with an invalid data URI', function (done) {
    content.meta = {
      audio: {}
    };

    headReq();
    postReq();

    rv.validate(function () {
      should.exist(rv.errors.InvalidDataURI);
      done();
    });
  });

  it('should return with a valid data URI with a file size that is too big', function (done) {
    content = {
      content: {
        data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQAB' + Array(1000).join('A') + '='
      },
      meta: {
        audio: {}
      }
    };

    headReq();
    postReq();

    rv.validate(function () {
      should.exist(rv.errors.FileTooLarge);
      done();
    });
  });

  it('should return with an invalid file type', function (done) {
    content = {
      content: {
        data: 'data:image/tiff;base64,/9j/4AAQSkZJRgABAQAAAQAB' + Array(10).join('A') + '='
      },
      meta: {
        audio: {}
      }
    };

    headReq();
    postReq();

    rv.validate(function () {
      should.exist(rv.errors.InvalidFileType);
      done();
    });
  });

  it('should return with a valid data URI', function (done) {
    content = {
      content: {
        data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQAB' + Array(10).join('A') + '='
      },
      meta: {
        audio: {}
      }
    };

    headReq();
    postReq();

    rv.validate(function () {
      rv.errors.should.eql({});
      done();
    });
  });
});