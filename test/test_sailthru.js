'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.receiveOptoutPost = receiveOptoutPost;

var _createSailthruClient = require('../lib/sailthru');

var _testCase = require('nodeunit');

// import {testCase} from 'nodeunit';

var SailthruClient = _createSailthruClient.createSailthruClient('abcd12345', '1324qwerty'),
    SailthruClientBadUrl = _createSailthruClient.createSailthruClient('abcd12345', '1324qwerty', 'http://foo');
SailthruClient.disableLogging();
SailthruClientBadUrl.disableLogging();

function receiveOptoutPost(test) {
    test.expect(1);

    // Valid params
    var params1 = { action: 'optout',
        email: 'foo@bar.com',
        sig: '89b9fce5296ce2920dad46ed3467001d' },
        real1 = SailthruClient.receiveOptoutPost(params1);
    test.ok(real1);

    test.done();
}
