import {createSailthruClient} from '../lib/sailthru';
import {testCase} from 'nodeunit';
// import {testCase} from 'nodeunit';

let SailthruClient = createSailthruClient('abcd12345', '1324qwerty'),
    SailthruClientBadUrl = createSailthruClient('abcd12345', '1324qwerty', 'http://foo');
SailthruClient.disableLogging();
SailthruClientBadUrl.disableLogging();

export function receiveOptoutPost(test) {
    test.expect(2);

    // Valid params
    let params1 = {action: 'optout',
                   email: 'foo@bar.com',
                   sig: '89b9fce5296ce2920dad46ed3467001d'},
        real1 = SailthruClient.receiveOptoutPost(params1);
    test.ok(real1);
}
