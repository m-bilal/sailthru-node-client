import SailthruUtil from '../lib/sailthru_util';
import testCase from 'nodeunit';
import {exec, spawn} from 'child_process';

export function testExtractParams(test) {
    test.expect(4);

    let expected1 = [1, 2, 3];
    let real1 = SailthruUtil.extractParamValues(expected1);
    test.deepEqual(real1, expected1);

    let expected2 = ['unix', 'linux', 'windows'];
    let params2 = {os1: 'unix',
                   os2: 'linux',
                   os3: 'windows'};
    let real2 = SailthruUtil.extractParamValues(params2);
    test.deepEqual(real2, expected2);
}